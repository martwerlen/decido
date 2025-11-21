#!/usr/bin/env node

/**
 * Cron Job: Envoyer des rappels avant deadline
 * Fréquence: Quotidien à 9h UTC
 *
 * Ce script envoie des emails de rappel aux participants qui n'ont pas encore voté
 * pour les décisions dont la deadline est dans moins de 24h.
 */

const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');

const prisma = new PrismaClient();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const APP_URL = process.env.APP_URL;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@decidoo.fr';

async function sendReminders() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  console.log(`⏰ [${now.toISOString()}] Début de l'envoi des rappels de deadline`);

  try {
    // Trouver toutes les décisions OPEN avec deadline dans les prochaines 24h
    const decisions = await prisma.decision.findMany({
      where: {
        status: 'OPEN',
        endDate: {
          gte: now,
          lte: in24Hours
        }
      },
      include: {
        organization: {
          select: { name: true, slug: true }
        },
        participants: {
          where: { hasVoted: false },
          include: {
            user: {
              select: { email: true, name: true }
            },
            externalParticipant: {
              select: { email: true, name: true }
            }
          }
        }
      }
    });

    console.log(`📊 ${decisions.length} décision(s) avec deadline dans 24h`);

    let remindersSent = 0;
    let errors = 0;

    for (const decision of decisions) {
      const participantsToRemind = decision.participants.filter(p => !p.hasVoted);

      console.log(`📧 Décision "${decision.title}": ${participantsToRemind.length} participant(s) à relancer`);

      for (const participant of participantsToRemind) {
        const email = participant.user?.email || participant.externalParticipant?.email;
        const name = participant.user?.name || participant.externalParticipant?.name;

        if (!email) {
          console.warn(`⚠️ Participant ${participant.id} sans email`);
          continue;
        }

        try {
          const voteUrl = participant.token
            ? `${APP_URL}/vote/${participant.token}`
            : `${APP_URL}/${decision.organization.slug}/decisions/${decision.id}/vote`;

          const deadlineFormatted = new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short'
          }).format(decision.endDate);

          const html = `
            <h2>Rappel : Votre vote est attendu</h2>
            <p>Bonjour ${name},</p>
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
              html
            });
            console.log(`✅ Rappel envoyé à ${email}`);
            remindersSent++;
          } else {
            console.log(`⚠️ RESEND_API_KEY non configurée, email non envoyé à ${email}`);
            console.log(`📧 HTML:\n${html}`);
          }
        } catch (error) {
          console.error(`❌ Erreur envoi email à ${email}:`, error);
          errors++;
        }
      }
    }

    console.log(`✅ Cron terminé: ${remindersSent} rappel(s) envoyé(s), ${errors} erreur(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur critique:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

sendReminders();
