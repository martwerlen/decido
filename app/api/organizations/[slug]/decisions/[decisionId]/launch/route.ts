import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// POST /api/organizations/[slug]/decisions/[decisionId]/launch - Lance une décision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug, decisionId } = await params;

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: "Organisation non trouvée" }, { status: 404 });
    }

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
      include: {
        organization: true,
        proposals: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Seul le créateur peut lancer la décision
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut lancer cette décision' },
        { status: 403 }
      );
    }

    // La décision doit être en mode DRAFT
    if (decision.status !== 'DRAFT') {
      return Response.json(
        { error: 'Cette décision a déjà été lancée' },
        { status: 400 }
      );
    }

    // Vérifications selon le type de décision
    if (decision.decisionType === 'MAJORITY') {
      // Pour la majorité, il faut au moins 2 propositions
      if (decision.proposals.length < 2) {
        return Response.json(
          { error: 'Au moins 2 propositions sont requises pour un vote à la majorité' },
          { status: 400 }
        );
      }
    } else if (decision.decisionType === 'CONSENSUS') {
      // Pour le consensus, il faut une proposition initiale
      if (!decision.initialProposal) {
        return Response.json(
          { error: 'Une proposition initiale est requise pour le consensus' },
          { status: 400 }
        );
      }
    }

    // Vérifier qu'il y a des participants
    if (decision.votingMode === 'INVITED' && decision.participants.length === 0) {
      return Response.json(
        { error: 'Au moins un participant doit être invité' },
        { status: 400 }
      );
    }

    // Vérifier qu'une date de fin est définie
    if (!decision.endDate) {
      return Response.json(
        { error: 'Une date de fin doit être définie' },
        { status: 400 }
      );
    }

    // Générer un token public si mode PUBLIC_LINK
    let publicToken = decision.publicToken;
    if (decision.votingMode === 'PUBLIC_LINK' && !publicToken) {
      publicToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Mettre à jour la décision
    const updated = await prisma.decision.update({
      where: { id: decisionId },
      data: {
        status: 'OPEN',
        startDate: new Date(),
        publicToken,
      },
    });

    // Envoyer des emails aux participants si mode INVITED
    if (decision.votingMode === 'INVITED') {
      console.log(`\n📧 === ENVOI EMAILS === ${decision.participants.length} participant(s)\n`);

      const emailPromises = decision.participants.map(async (participant) => {
        const email = participant.externalEmail || participant.user?.email;
        const name = participant.externalName || participant.user?.name || 'Participant';

        if (!email) {
          console.warn(`⚠️  Participant sans email ignoré: ${name}`);
          return;
        }

        const voteUrl = `${process.env.NEXTAUTH_URL}/organizations/${slug}/decisions/${decisionId}/vote`;

        try {
          console.log(`📤 Envoi à ${email} (${name})`);
          await sendEmail({
            to: email,
            subject: `Nouvelle décision: ${decision.title}`,
            html: `
              <h2>Vous êtes invité à participer à une décision</h2>
              <p>Bonjour ${name},</p>
              <p>L'organisation <strong>${decision.organization.name}</strong> vous invite à participer à une décision :</p>
              <h3>${decision.title}</h3>
              <p>${decision.description}</p>
              <p><strong>Type de décision :</strong> ${decision.decisionType === 'MAJORITY' ? 'Vote à la majorité' : 'Consensus'}</p>
              <p><strong>Date limite :</strong> ${new Date(decision.endDate).toLocaleDateString('fr-FR')}</p>
              <p>
                <a href="${voteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">
                  Participer à la décision
                </a>
              </p>
              <p>Vous pouvez également cliquer sur ce lien : <a href="${voteUrl}">${voteUrl}</a></p>
            `,
          });
          console.log(`✅ Envoyé à ${email}`);
        } catch (error) {
          console.error(`❌ Erreur pour ${email}:`, error);
        }
      });

      await Promise.allSettled(emailPromises);
      console.log(`\n📧 === FIN ENVOI EMAILS ===\n`);
    }

    return Response.json({
      decision: updated,
      message: 'Décision lancée avec succès',
    });
  } catch (error) {
    console.error('Error launching decision:', error);
    return Response.json(
      { error: 'Erreur lors du lancement de la décision' },
      { status: 500 }
    );
  }
}
