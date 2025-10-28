import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/organizations/[slug]/decisions/[decisionId]/proposals/[proposalId] - Met à jour une proposition
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; decisionId: string; proposalId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug, decisionId, proposalId } = params;
    const body = await request.json();

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: slug,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Seul le créateur peut modifier les propositions
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut modifier les propositions' },
        { status: 403 }
      );
    }

    // On ne peut modifier les propositions qu'en mode DRAFT
    if (decision.status !== 'DRAFT') {
      return Response.json(
        { error: 'Les propositions ne peuvent être modifiées qu\'en mode brouillon' },
        { status: 400 }
      );
    }

    // Récupérer la proposition
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        decisionId,
      },
    });

    if (!proposal) {
      return Response.json({ error: 'Proposition non trouvée' }, { status: 404 });
    }

    // Mettre à jour la proposition
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.order !== undefined) updateData.order = body.order;

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: updateData,
    });

    return Response.json({ proposal: updated });
  } catch (error) {
    console.error('Error updating proposal:', error);
    return Response.json(
      { error: 'Erreur lors de la mise à jour de la proposition' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[slug]/decisions/[decisionId]/proposals/[proposalId] - Supprime une proposition
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; decisionId: string; proposalId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug, decisionId, proposalId } = params;

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: slug,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Seul le créateur peut supprimer les propositions
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut supprimer les propositions' },
        { status: 403 }
      );
    }

    // On ne peut supprimer les propositions qu'en mode DRAFT
    if (decision.status !== 'DRAFT') {
      return Response.json(
        { error: 'Les propositions ne peuvent être supprimées qu\'en mode brouillon' },
        { status: 400 }
      );
    }

    // Récupérer la proposition
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        decisionId,
      },
    });

    if (!proposal) {
      return Response.json({ error: 'Proposition non trouvée' }, { status: 404 });
    }

    await prisma.proposal.delete({
      where: { id: proposalId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return Response.json(
      { error: 'Erreur lors de la suppression de la proposition' },
      { status: 500 }
    );
  }
}
