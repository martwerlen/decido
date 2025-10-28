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
    const awaitingParticipation = await prisma.decision.findMany({
      where: {
        organizationId: organization.id,
        status: 'OPEN',
        participants: {
          some: {
            userId: session.user.id,
            hasVoted: false,
          },
        },
      },
      select: {
        id: true,
        title: true,
        endDate: true,
      },
      orderBy: {
        endDate: 'asc',
      },
      take: 5,
    });

    // 2. Décisions en cours de l'organisation (où l'utilisateur n'est pas invité)
    const ongoingDecisions = await prisma.decision.findMany({
      where: {
        organizationId: organization.id,
        status: 'OPEN',
        NOT: {
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        endDate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // 3. Décisions terminées
    const completedDecisions = await prisma.decision.findMany({
      where: {
        organizationId: organization.id,
        status: {
          in: ['CLOSED', 'IMPLEMENTED', 'ARCHIVED'],
        },
      },
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
    });

    return Response.json({
      awaitingParticipation,
      ongoingDecisions,
      completedDecisions,
    });
  } catch (error) {
    console.error('Error fetching sidebar decisions:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération des décisions' },
      { status: 500 }
    );
  }
}
