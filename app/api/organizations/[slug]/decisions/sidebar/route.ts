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

    // 1. Décisions en cours où l'utilisateur est invité (participation attendue)
    const awaitingParticipationWhere = {
      organizationId: organization.id,
      status: 'OPEN',
      participants: {
        some: {
          userId: session.user.id,
          hasVoted: false,
        },
      },
    };

    const [awaitingParticipation, awaitingParticipationTotal] = await Promise.all([
      prisma.decision.findMany({
        where: awaitingParticipationWhere,
        select: {
          id: true,
          title: true,
          endDate: true,
        },
        orderBy: {
          endDate: 'asc',
        },
        take: 5,
      }),
      prisma.decision.count({ where: awaitingParticipationWhere }),
    ]);

    // 2. Décisions en cours de l'organisation (où l'utilisateur n'est pas invité)
    const ongoingDecisionsWhere = {
      organizationId: organization.id,
      status: 'OPEN',
      NOT: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
    };

    const [ongoingDecisions, ongoingDecisionsTotal] = await Promise.all([
      prisma.decision.findMany({
        where: ongoingDecisionsWhere,
        select: {
          id: true,
          title: true,
          endDate: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
      prisma.decision.count({ where: ongoingDecisionsWhere }),
    ]);

    // 3. Décisions terminées
    const completedDecisionsWhere = {
      organizationId: organization.id,
      status: {
        in: ['CLOSED', 'IMPLEMENTED', 'ARCHIVED'],
      },
    };

    const [completedDecisions, completedDecisionsTotal] = await Promise.all([
      prisma.decision.findMany({
        where: completedDecisionsWhere,
        select: {
          id: true,
          title: true,
          decidedAt: true,
          result: true,
        },
        orderBy: {
          decidedAt: 'desc',
        },
        take: 5,
      }),
      prisma.decision.count({ where: completedDecisionsWhere }),
    ]);

    return Response.json({
      awaitingParticipation,
      awaitingParticipationTotal,
      ongoingDecisions,
      ongoingDecisionsTotal,
      completedDecisions,
      completedDecisionsTotal,
    });
  } catch (error) {
    console.error('Error fetching sidebar decisions:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération des décisions' },
      { status: 500 }
    );
  }
}
