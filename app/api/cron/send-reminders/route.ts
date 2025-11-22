import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@decidoo.fr';

/**
 * API endpoint pour envoyer des rappels aux participants
 *
 * Envoie des emails de rappel aux participants qui n'ont pas encore voté
 * pour les décisions dont la deadline est dans moins de 24h.
 *
 * Fréquence recommandée: Quotidien à 9h UTC
 *
 * Sécurité: Requiert un Bearer token (CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification du token d'autorisation
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && token !== cronSecret) {
      return Response.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      );
    }

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log(`⏰ [${now.toISOString()}] Début de l'envoi des rappels de deadline`);

    // Trouver toutes les décisions OPEN avec deadline dans les prochaines 24h
    const decisions = await prisma.decision.findMany({
      where: {
        status: 'OPEN',
        endDate: {
          gte: now,
          lte: in24Hours,
        },
      },
      include: {
        organization: {
          select: { name: true, slug: true },
        },
        participants: {
          where: { hasVoted: false },
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
    });

    console.log(`📊 ${decisions.length} décision(s) avec deadline dans 24h`);

    let remindersSent = 0;
    const errors: string[] = [];

    for (const decision of decisions) {
      const participantsToRemind = decision.participants.filter((p) => !p.hasVoted);

      console.log(
        `📧 Décision "${decision.title}": ${participantsToRemind.length} participant(s) à relancer`
      );

      for (const participant of participantsToRemind) {
        const email = participant.user?.email || participant.externalEmail;
        const name = participant.user?.name || participant.externalName;

        if (!email) {
          console.warn(`⚠️ Participant ${participant.id} sans email`);
          continue;
        }

        try {
          const voteUrl = participant.token
            ? `${process.env.NEXTAUTH_URL}/vote/${participant.token}`
            : `${process.env.NEXTAUTH_URL}/${decision.organization.slug}/decisions/${decision.id}/vote`;

          const deadlineFormatted = decision.endDate
            ? new Intl.DateTimeFormat('fr-FR', {
                dateStyle: 'long',
                timeStyle: 'short',
              }).format(decision.endDate)
            : 'Bientôt';

          const html = `
            <h2>Rappel : Votre vote est attendu</h2>
            <p>Bonjour ${name || 'cher participant'},</p>
            <p>La décision <strong>"${decision.title}"</strong> arrive à échéance dans moins de 24 heures.</p>
            <p><strong>Deadline :</strong> ${deadlineFormatted}</p>
            <p>Vous n'avez pas encore voté. Votre participation est importante !</p>
            <p><a href="${voteUrl}" style="display:inline-block;background:#4a7c59;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin:16px 0;">Voter maintenant</a></p>
            <p>Organisation : ${decision.organization.name}</p>
            <hr>
            <p style="color:#666;font-size:0.9em;">Ce message a été envoyé automatiquement par Decidoo.</p>
          `;

          if (resend) {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: email,
              subject: `Rappel : Vote requis pour "${decision.title}"`,
              html,
            });
            console.log(`✅ Rappel envoyé à ${email}`);
            remindersSent++;
          } else {
            console.log(`⚠️ RESEND_API_KEY non configurée, email non envoyé à ${email}`);
          }
        } catch (error) {
          console.error(`❌ Erreur envoi email à ${email}:`, error);
          errors.push(`${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return Response.json({
      success: true,
      timestamp: now.toISOString(),
      decisions: decisions.length,
      remindersSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Erreur critique dans send-reminders:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
