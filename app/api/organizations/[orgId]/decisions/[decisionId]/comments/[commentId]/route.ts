import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/organizations/[orgId]/decisions/[decisionId]/comments/[commentId] - Met à jour un commentaire
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string; decisionId: string; commentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { orgId, decisionId, commentId } = params;
    const body = await request.json();

    // Récupérer le commentaire
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        decisionId,
      },
    });

    if (!comment) {
      return Response.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    // Seul l'auteur peut modifier son commentaire
    if (comment.userId !== session.user.id) {
      return Response.json(
        { error: 'Vous ne pouvez modifier que vos propres commentaires' },
        { status: 403 }
      );
    }

    // Récupérer la décision pour vérifier qu'elle est encore OPEN
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: orgId,
      },
    });

    if (!decision || decision.status !== 'OPEN') {
      return Response.json(
        { error: 'La décision n\'est plus ouverte aux modifications' },
        { status: 400 }
      );
    }

    // Validation
    const { content } = body;

    if (!content || content.trim() === '') {
      return Response.json(
        { error: 'Le contenu du commentaire est requis' },
        { status: 400 }
      );
    }

    // Mettre à jour le commentaire
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        updatedAt: new Date(),
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

    return Response.json({ comment: updated });
  } catch (error) {
    console.error('Error updating comment:', error);
    return Response.json(
      { error: 'Erreur lors de la mise à jour du commentaire' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[orgId]/decisions/[decisionId]/comments/[commentId] - Supprime un commentaire
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string; decisionId: string; commentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { orgId, decisionId, commentId } = params;

    // Récupérer le commentaire
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        decisionId,
      },
    });

    if (!comment) {
      return Response.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    // Seul l'auteur ou le créateur de la décision peut supprimer
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: orgId,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    if (comment.userId !== session.user.id && decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Vous n\'êtes pas autorisé à supprimer ce commentaire' },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return Response.json(
      { error: 'Erreur lors de la suppression du commentaire' },
      { status: 500 }
    );
  }
}
