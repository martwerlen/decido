import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logDecisionWithdrawn } from '@/lib/decision-logger';

/**
 * PATCH /api/organizations/[slug]/decisions/[decisionId]/withdraw
 * Retire une décision (passe le status à CLOSED et result à WITHDRAWN)
 * Accessible uniquement au créateur de la décision
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
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
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    if (org.members.length === 0) {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer la décision
    const decision = await prisma.decision.findUnique({
      where: {
        id: decisionId,
        organizationId: org.id
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est le créateur
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut retirer cette décision' },
        { status: 403 }
      );
    }

    // Vérifier que la décision est encore ouverte
    if (decision.status !== 'OPEN') {
      return Response.json(
        { error: 'Seules les décisions en cours peuvent être retirées' },
        { status: 400 }
      );
    }

    // Retirer la décision
    const updatedDecision = await prisma.decision.update({
      where: { id: decisionId },
      data: {
        status: 'CLOSED',
        result: 'WITHDRAWN',
        decidedAt: new Date(),
      },
    });

    // Logger le retrait
    await logDecisionWithdrawn(decisionId, session.user.id);

    return Response.json({
      decision: updatedDecision,
      message: 'Décision retirée avec succès',
    });
  } catch (error) {
    console.error('Error withdrawing decision:', error);
    return Response.json(
      { error: 'Erreur lors du retrait de la décision' },
      { status: 500 }
    );
  }
}
