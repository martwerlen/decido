import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organizations/[slug]/decisions/sidebar - Récupère les décisions pour le sidebar
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug } = await params;

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est membre de l'organisation
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: organization.id,
        },
      },
    });

    if (!membership) {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // 1. Décisions en cours (OPEN) - Limiter à 5 plus récentes
    const ongoingWhere = {
      organizationId: organization.id,
      status: 'OPEN',
    };

    const [ongoingDecisions, ongoingTotal] = await Promise.all([
      prisma.decision.findMany({
        where: ongoingWhere,
        select: {
          id: true,
          title: true,
          status: true,
          votingMode: true,
          decisionType: true,
          consentCurrentStage: true,
          creatorId: true,
          participants: {
            where: {
              userId: session.user.id,
            },
            select: {
              hasVoted: true,
            },
          },
          clarificationQuestions: {
            where: {
              questionerId: session.user.id,
            },
            select: {
              id: true,
            },
          },
          opinionResponses: {
            where: {
              userId: session.user.id,
            },
            select: {
              id: true,
            },
          },
          consentObjections: {
            where: {
              userId: session.user.id,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5, // Limiter à 5 décisions
      }),
      prisma.decision.count({ where: ongoingWhere }),
    ]);

    // Enrichir avec les infos de participation
    const enrichedOngoing = ongoingDecisions.map((decision: typeof ongoingDecisions[number]) => {
      const isParticipant = decision.participants.length > 0;
      let hasVoted = false;

      if (decision.decisionType === 'CONSENT') {
        // Pour les décisions CONSENT, déterminer hasVoted selon le stade actuel
        const currentStage = decision.consentCurrentStage;

        if (currentStage === 'CLARIFICATIONS') {
          // Stade questions : a-t-il posé au moins une question ?
          hasVoted = decision.clarificationQuestions.length > 0;
        } else if (currentStage === 'CLARIFAVIS') {
          // Stade clarifavis (questions ET avis combinés) : a-t-il posé une question OU donné son avis ?
          hasVoted = decision.clarificationQuestions.length > 0 || decision.opinionResponses.length > 0;
        } else if (currentStage === 'AVIS') {
          // Stade avis : a-t-il donné son avis ?
          hasVoted = decision.opinionResponses.length > 0;
        } else if (currentStage === 'OBJECTIONS') {
          // Stade objections : a-t-il enregistré sa position ?
          hasVoted = decision.consentObjections.length > 0;
        } else {
          // Pour les autres stades (AMENDEMENTS, TERMINEE), utiliser la logique par défaut
          hasVoted = isParticipant ? decision.participants[0].hasVoted : false;
        }
      } else {
        // Pour les autres types de décisions, utiliser hasVoted standard
        hasVoted = isParticipant ? decision.participants[0].hasVoted : false;
      }

      return {
        id: decision.id,
        title: decision.title,
        status: decision.status,
        votingMode: decision.votingMode,
        isCreator: decision.creatorId === session.user.id,
        isParticipant,
        hasVoted,
      };
    });

    // 2. Décisions terminées (CLOSED, IMPLEMENTED, ARCHIVED, WITHDRAWN) - Limiter à 5 plus récentes
    const completedWhere = {
      organizationId: organization.id,
      status: {
        in: ['CLOSED', 'IMPLEMENTED', 'ARCHIVED', 'WITHDRAWN'],
      },
    };

    const [completedDecisions, completedTotal] = await Promise.all([
      prisma.decision.findMany({
        where: completedWhere,
        select: {
          id: true,
          title: true,
          status: true,
          result: true,
          votingMode: true,
          creatorId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5, // Limiter à 5 décisions
      }),
      prisma.decision.count({ where: completedWhere }),
    ]);

    // Enrichir les décisions terminées avec isCreator
    const enrichedCompleted = completedDecisions.map((decision: typeof completedDecisions[number]) => ({
      id: decision.id,
      title: decision.title,
      status: decision.status,
      result: decision.result,
      votingMode: decision.votingMode,
      isCreator: decision.creatorId === session.user.id,
    }));

    // 3. Compter les brouillons de l'utilisateur
    const draftsCount = await prisma.decision.count({
      where: {
        organizationId: organization.id,
        status: 'DRAFT',
        creatorId: session.user.id,
      },
    });

    return Response.json({
      ongoing: enrichedOngoing,
      ongoingTotal,
      completed: enrichedCompleted,
      completedTotal,
      draftsCount, // Ajouter le nombre de brouillons
    });
  } catch (error) {
    console.error('Error fetching sidebar decisions:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération des décisions' },
      { status: 500 }
    );
  }
}
