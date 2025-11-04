import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/organizations/[slug]/decisions/[decisionId]/withdraw - Retire la décision (WITHDRAWN)
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

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
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

    // Vérifier que c'est le créateur
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut retirer cette décision' },
        { status: 403 }
      );
    }

    // Vérifier que la décision n'est pas déjà fermée
    if (decision.status === 'CLOSED') {
      return Response.json(
        { error: 'Cette décision est déjà fermée' },
        { status: 400 }
      );
    }

    // Retirer la décision
    const updatedDecision = await prisma.decision.update({
      where: {
        id: decisionId,
      },
      data: {
        status: 'CLOSED',
        result: 'WITHDRAWN',
        decidedAt: new Date(),
      },
    });

    // Logger le retrait
    const userName = session.user.name || session.user.email || 'Créateur';
    await prisma.decisionLog.create({
      data: {
        decisionId,
        eventType: 'STATUS_CHANGED',
        actorId: session.user.id,
        actorName: userName,
        actorEmail: session.user.email || undefined,
        oldValue: decision.status,
        newValue: 'CLOSED',
        metadata: JSON.stringify({ result: 'WITHDRAWN' }),
      },
    });

    return Response.json({ decision: updatedDecision });
  } catch (error) {
    console.error('Error withdrawing decision:', error);
    return Response.json(
      { error: 'Erreur lors du retrait de la décision' },
      { status: 500 }
    );
  }
}
