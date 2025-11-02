import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/organizations/[slug]/decisions/[decisionId]/close
 * Ferme manuellement une décision (passe le status à CLOSED)
 * Accessible uniquement au créateur de la décision
 */
export async function PATCH(
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
    });

    if (!decision) {
      return NextResponse.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est le créateur
    if (decision.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Seul le créateur peut fermer cette décision' }, { status: 403 });
    }

    // Vérifier que la décision n'est pas déjà fermée
    if (decision.status === 'CLOSED') {
      return NextResponse.json({ error: 'La décision est déjà fermée' }, { status: 400 });
    }

    // Fermer la décision
    const updatedDecision = await prisma.decision.update({
      where: { id: decisionId },
      data: {
        status: 'CLOSED',
        decidedAt: new Date(),
      },
    });

    return NextResponse.json({
      decision: updatedDecision,
      message: 'Décision fermée avec succès',
    });
  } catch (error) {
    console.error('Error closing decision:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la fermeture de la décision' },
      { status: 500 }
    );
  }
}
