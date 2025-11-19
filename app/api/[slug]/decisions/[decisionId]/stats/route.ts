import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/organizations/[slug]/decisions/[decisionId]/stats
 * Retourne les statistiques d'une décision (nombre de votes anonymes)
 * Accessible uniquement au créateur de la décision
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { slug, decisionId } = await params;

    // Vérifier que l'organisation existe et que l'utilisateur en est membre
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    if (org.members.length === 0) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer la décision
    const decision = await prisma.decision.findUnique({
      where: {
        id: decisionId,
        organizationId: org.id
      },
      select: {
        id: true,
        creatorId: true,
        votingMode: true,
        _count: {
          select: {
            anonymousVoteLogs: true,
          },
        },
      },
    });

    if (!decision) {
      return NextResponse.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est le créateur
    if (decision.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Vérifier que c'est une décision PUBLIC_LINK
    if (decision.votingMode !== 'PUBLIC_LINK') {
      return NextResponse.json({ error: 'Cette décision n\'est pas en mode vote public' }, { status: 400 });
    }

    return NextResponse.json({
      voteCount: decision._count.anonymousVoteLogs,
    });
  } catch (error) {
    console.error('Error fetching decision stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
