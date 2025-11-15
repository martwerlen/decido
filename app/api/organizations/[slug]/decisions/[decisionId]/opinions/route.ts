import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canGiveOpinion } from '@/lib/consent-logic';
import { ConsentStage, ConsentStepMode } from '@/types/enums';
import { logConsentOpinionSubmitted } from '@/lib/decision-logger';

// GET /api/organizations/[slug]/decisions/[decisionId]/opinions - Récupère tous les avis
export async function GET(
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
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!organization) {
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est membre
    if (organization.members.length === 0) {
      return Response.json(
        { error: 'Vous n\'êtes pas membre de cette organisation' },
        { status: 403 }
      );
    }

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier que c'est bien une décision qui utilise le système d'avis
    if (decision.decisionType !== 'ADVICE_SOLICITATION' && decision.decisionType !== 'CONSENT') {
      return Response.json(
        { error: 'Cette décision n\'utilise pas le système d\'avis' },
        { status: 400 }
      );
    }

    // Récupérer tous les avis
    const opinions = await prisma.opinionResponse.findMany({
      where: {
        decisionId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        externalParticipant: {
          select: {
            id: true,
            externalName: true,
            externalEmail: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Chronologique
      },
    });

    return Response.json({ opinions });
  } catch (error) {
    console.error('Error fetching opinions:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération des avis' },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[slug]/decisions/[decisionId]/opinions - Crée ou modifie un avis
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
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    // Validation
    if (!content || content.trim() === '') {
      return Response.json(
        { error: 'Le contenu de l\'avis est requis' },
        { status: 400 }
      );
    }

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
      include: {
        opinionResponses: true,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier que c'est bien une décision qui utilise le système d'avis
    if (decision.decisionType !== 'ADVICE_SOLICITATION' && decision.decisionType !== 'CONSENT') {
      return Response.json(
        { error: 'Cette décision n\'utilise pas le système d\'avis' },
        { status: 400 }
      );
    }

    // La décision doit être OPEN pour donner un avis
    if (decision.status !== 'OPEN') {
      return Response.json(
        { error: 'Cette décision n\'est pas ouverte aux avis' },
        { status: 400 }
      );
    }

    // Pour CONSENT: vérifier que le stade actuel permet de donner des avis
    if (decision.decisionType === 'CONSENT') {
      const currentStage = decision.consentCurrentStage as ConsentStage | null;
      const stepMode = decision.consentStepMode as ConsentStepMode || 'DISTINCT';

      if (!canGiveOpinion(currentStage, stepMode)) {
        return Response.json(
          { error: 'Les avis ne peuvent pas être donnés à ce stade de la décision' },
          { status: 400 }
        );
      }
    }

    // Vérifier que l'utilisateur est un participant invité à donner son avis
    const participant = await prisma.decisionParticipant.findFirst({
      where: {
        decisionId,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return Response.json(
        { error: 'Vous n\'êtes pas sollicité pour donner votre avis sur cette décision' },
        { status: 403 }
      );
    }

    // Vérifier si l'intention peut encore être modifiée
    // (elle peut être modifiée par le créateur uniquement si aucun avis n'a encore été donné)
    const existingOpinionCount = decision.opinionResponses.length;

    // Vérifier si un avis existe déjà pour cet utilisateur
    const existingOpinion = await prisma.opinionResponse.findFirst({
      where: {
        decisionId,
        userId: session.user.id,
      },
    });

    let opinion;
    let isUpdate = false;

    if (existingOpinion) {
      // Mettre à jour l'avis existant
      opinion = await prisma.opinionResponse.update({
        where: {
          id: existingOpinion.id,
        },
        data: {
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      isUpdate = true;

      // Pas de log pour la modification d'avis (uniquement pour la première soumission)
    } else {
      // Créer un nouvel avis
      opinion = await prisma.opinionResponse.create({
        data: {
          content,
          userId: session.user.id,
          decisionId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Marquer le participant comme ayant donné son avis (uniquement pour ADVICE_SOLICITATION)
      // Pour CONSENT, hasVoted est réservé pour le stade OBJECTIONS
      if (decision.decisionType === 'ADVICE_SOLICITATION') {
        await prisma.decisionParticipant.update({
          where: {
            id: participant.id,
          },
          data: {
            hasVoted: true,
          },
        });
      }

      // Logger le dépôt de l'avis
      const userName = session.user.name || session.user.email || 'Utilisateur';
      if (decision.decisionType === 'CONSENT') {
        await logConsentOpinionSubmitted(decisionId, session.user.id, userName);
      } else {
        // Pour ADVICE_SOLICITATION
        await prisma.decisionLog.create({
          data: {
            decisionId,
            eventType: 'OPINION_SUBMITTED',
            actorId: session.user.id,
            actorName: userName,
            actorEmail: session.user.email || undefined,
          },
        });
      }
    }

    return Response.json(
      { opinion, isUpdate },
      { status: isUpdate ? 200 : 201 }
    );
  } catch (error) {
    console.error('Error creating/updating opinion:', error);
    return Response.json(
      { error: 'Erreur lors de l\'enregistrement de l\'avis' },
      { status: 500 }
    );
  }
}
