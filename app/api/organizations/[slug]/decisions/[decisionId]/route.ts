import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidDecisionType, isValidDecisionStatus } from '@/types/enums';
import {
  logDecisionTitleUpdated,
  logDecisionDescriptionUpdated,
  logDecisionDeadlineUpdated,
  logProposalAmended,
} from '@/lib/decision-logger';

// GET /api/organizations/[slug]/decisions/[decisionId] - Récupère une décision
export async function GET(
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
      return Response.json({ error: "Organisation non trouvée" }, { status: 404 });
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

    // Récupérer la décision avec toutes ses relations
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        proposals: {
          orderBy: {
            order: 'asc',
          },
          include: {
            _count: {
              select: {
                proposalVotes: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        comments: {
          where: {
            parentId: null, // Seulement les commentaires racines
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            votes: true,
            comments: true,
          },
        },
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a voté
    const userVote = await prisma.vote.findUnique({
      where: {
        userId_decisionId: {
          userId: session.user.id,
          decisionId,
        },
      },
    });

    // Pour vote à la majorité, vérifier s'il a voté pour une proposition
    let userProposalVote = null;
    if (decision.decisionType === 'MAJORITY') {
      userProposalVote = await prisma.proposalVote.findFirst({
        where: {
          userId: session.user.id,
          decisionId,
        },
        include: {
          proposal: true,
        },
      });
    }

    return Response.json({
      decision,
      userVote,
      userProposalVote,
      isCreator: decision.creatorId === session.user.id,
    });
  } catch (error) {
    console.error('Error fetching decision:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération de la décision' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[slug]/decisions/[decisionId] - Met à jour une décision
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

    // Seul le créateur peut modifier la décision
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut modifier cette décision' },
        { status: 403 }
      );
    }

    // Si la décision est OPEN ou CLOSED, on ne peut plus modifier certains champs
    if (decision.status === 'OPEN' || decision.status === 'CLOSED') {
      // On peut seulement modifier proposal pour le consensus
      if (decision.decisionType === 'CONSENSUS' && body.proposal !== undefined) {
        // Vérifier si la proposition a réellement changé
        if (body.proposal !== decision.proposal) {
          const updated = await prisma.decision.update({
            where: { id: decisionId },
            data: {
              proposal: body.proposal,
            },
          });

          // Récupérer les informations de l'utilisateur
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true },
          });

          // Créer un commentaire système pour notifier la modification
          await prisma.comment.create({
            data: {
              content: `${user?.name || user?.email || 'Un utilisateur'} a modifié la proposition`,
              decisionId,
              userId: session.user.id,
            },
          });

          // Logger l'amendement
          await logProposalAmended(decisionId, session.user.id);

          return Response.json({ decision: updated });
        }

        // Si pas de changement, juste retourner la décision actuelle
        return Response.json({ decision });
      }

      return Response.json(
        { error: 'Cette décision ne peut plus être modifiée' },
        { status: 400 }
      );
    }

    // Construire les données à mettre à jour
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.endDate !== undefined) {
      const endDateObj = new Date(body.endDate);
      const minDate = new Date();
      minDate.setHours(minDate.getHours() + 24);

      if (endDateObj < minDate) {
        return Response.json(
          { error: 'La date de fin doit être au moins 24h dans le futur' },
          { status: 400 }
        );
      }

      updateData.endDate = endDateObj;
    }
    if (body.initialProposal !== undefined) updateData.initialProposal = body.initialProposal;
    if (body.proposal !== undefined) updateData.proposal = body.proposal;
    if (body.votingMode !== undefined) updateData.votingMode = body.votingMode;
    if (body.teamId !== undefined) updateData.teamId = body.teamId;

    // Mettre à jour la décision
    const updated = await prisma.decision.update({
      where: { id: decisionId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: true,
        proposals: true,
      },
    });

    // Logger les modifications
    if (body.title !== undefined && body.title !== decision.title) {
      await logDecisionTitleUpdated(decisionId, session.user.id, decision.title, body.title);
    }
    if (body.description !== undefined && body.description !== decision.description) {
      await logDecisionDescriptionUpdated(decisionId, session.user.id, decision.description, body.description);
    }
    if (body.endDate !== undefined) {
      const newEndDate = new Date(body.endDate);
      const oldEndDate = decision.endDate;
      if (oldEndDate?.getTime() !== newEndDate.getTime()) {
        await logDecisionDeadlineUpdated(decisionId, session.user.id, oldEndDate, newEndDate);
      }
    }
    if (body.proposal !== undefined && body.proposal !== decision.proposal) {
      await logProposalAmended(decisionId, session.user.id);
    }

    return Response.json({ decision: updated });
  } catch (error) {
    console.error('Error updating decision:', error);
    return Response.json(
      { error: 'Erreur lors de la mise à jour de la décision' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[slug]/decisions/[decisionId] - Supprime une décision
export async function DELETE(
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

    // Seul le créateur peut supprimer la décision
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut supprimer cette décision' },
        { status: 403 }
      );
    }

    // On ne peut supprimer que les décisions en mode DRAFT
    if (decision.status !== 'DRAFT') {
      return Response.json(
        { error: 'Seules les décisions en brouillon peuvent être supprimées' },
        { status: 400 }
      );
    }

    await prisma.decision.delete({
      where: { id: decisionId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting decision:', error);
    return Response.json(
      { error: 'Erreur lors de la suppression de la décision' },
      { status: 500 }
    );
  }
}
