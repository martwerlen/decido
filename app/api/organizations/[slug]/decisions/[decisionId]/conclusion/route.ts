import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/organizations/[slug]/decisions/[decisionId]/conclusion - Met à jour la conclusion
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
    const body = await request.json();

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    // Récupérer la décision avec les participants
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
      include: {
        participants: true,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Seul le créateur peut modifier la conclusion
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut modifier la conclusion' },
        { status: 403 }
      );
    }

    // Vérifier si le vote est terminé
    const now = new Date();
    const isDeadlinePassed = decision.endDate ? new Date(decision.endDate) <= now : false;
    const allParticipantsVoted = decision.participants.every((p) => p.hasVoted);
    const isVotingFinished = isDeadlinePassed || allParticipantsVoted;

    if (!isVotingFinished) {
      return Response.json(
        { error: 'La conclusion ne peut être modifiée que lorsque le vote est terminé' },
        { status: 400 }
      );
    }

    // Valider que le champ conclusion est fourni
    if (body.conclusion === undefined) {
      return Response.json(
        { error: 'Le champ conclusion est requis' },
        { status: 400 }
      );
    }

    // Mettre à jour la conclusion
    const updated = await prisma.decision.update({
      where: { id: decisionId },
      data: {
        conclusion: body.conclusion,
      },
    });

    return Response.json({ decision: updated });
  } catch (error) {
    console.error('Error updating conclusion:', error);
    return Response.json(
      { error: 'Erreur lors de la mise à jour de la conclusion' },
      { status: 500 }
    );
  }
}
