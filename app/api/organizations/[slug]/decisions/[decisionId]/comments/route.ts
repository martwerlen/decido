import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/organizations/[slug]/decisions/[decisionId]/comments - Ajoute un commentaire
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; decisionId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug, decisionId } = params;

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: "Organisation non trouvée" }, { status: 404 });
    }
    const body = await request.json();

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

    // La décision doit être OPEN pour commenter
    if (decision.status !== 'OPEN') {
      return Response.json(
        { error: 'Cette décision n\'est pas ouverte aux commentaires' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est autorisé à commenter
    if (decision.votingMode === 'INVITED') {
      const participant = await prisma.decisionParticipant.findFirst({
        where: {
          decisionId,
          userId: session.user.id,
        },
      });

      if (!participant) {
        return Response.json(
          { error: 'Vous n\'êtes pas autorisé à commenter sur cette décision' },
          { status: 403 }
        );
      }
    }

    // Validation
    const { content, parentId } = body;

    if (!content || content.trim() === '') {
      return Response.json(
        { error: 'Le contenu du commentaire est requis' },
        { status: 400 }
      );
    }

    // Si parentId fourni, vérifier que le parent existe
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: {
          id: parentId,
          decisionId,
        },
      });

      if (!parent) {
        return Response.json(
          { error: 'Commentaire parent non trouvé' },
          { status: 404 }
        );
      }
    }

    // Créer le commentaire
    const comment = await prisma.comment.create({
      data: {
        content,
        userId: session.user.id,
        decisionId,
        parentId: parentId || null,
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

    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return Response.json(
      { error: 'Erreur lors de la création du commentaire' },
      { status: 500 }
    );
  }
}
