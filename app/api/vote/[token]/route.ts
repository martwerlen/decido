import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/vote/[token] - Récupérer les informations de la décision pour un participant externe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Récupérer le participant par son token
    const participant = await prisma.decisionParticipant.findUnique({
      where: { token },
      include: {
        decision: {
          include: {
            proposals: {
              orderBy: {
                order: 'asc',
              },
            },
            comments: {
              where: {
                parentId: null,
              },
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
                externalParticipant: {
                  select: {
                    externalName: true,
                  },
                },
                replies: {
                  include: {
                    user: {
                      select: {
                        name: true,
                      },
                    },
                    externalParticipant: {
                      select: {
                        externalName: true,
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
          },
        },
      },
    });

    if (!participant) {
      return Response.json({ error: 'Lien invalide' }, { status: 404 });
    }

    // Vérifier que le token n'a pas expiré
    if (participant.tokenExpiresAt && new Date() > participant.tokenExpiresAt) {
      return Response.json({ error: 'Ce lien a expiré' }, { status: 410 });
    }

    // Vérifier que la décision est ouverte
    if (participant.decision.status !== 'OPEN') {
      return Response.json(
        { error: 'Cette décision n\'est plus ouverte au vote' },
        { status: 400 }
      );
    }

    // Récupérer le vote existant si présent
    let existingVote = null;
    let existingProposalVote = null;
    let existingComments: any[] = [];
    let existingOpinion = null;
    let allOpinions: any[] = [];

    if (participant.decision.decisionType === 'MAJORITY') {
      existingProposalVote = await prisma.proposalVote.findFirst({
        where: {
          externalParticipantId: participant.id,
          decisionId: participant.decision.id,
        },
        include: {
          proposal: true,
        },
      });
    } else if (participant.decision.decisionType === 'ADVICE_SOLICITATION') {
      // Pour ADVICE_SOLICITATION, récupérer l'avis du participant externe
      existingOpinion = await prisma.opinionResponse.findFirst({
        where: {
          externalParticipantId: participant.id,
          decisionId: participant.decision.id,
        },
      });

      // Récupérer tous les avis existants
      allOpinions = await prisma.opinionResponse.findMany({
        where: {
          decisionId: participant.decision.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          externalParticipant: {
            select: {
              id: true,
              externalName: true,
              externalEmail: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } else {
      existingVote = await prisma.vote.findFirst({
        where: {
          externalParticipantId: participant.id,
          decisionId: participant.decision.id,
        },
      });
    }

    // Récupérer les commentaires du participant externe
    existingComments = await prisma.comment.findMany({
      where: {
        externalParticipantId: participant.id,
        decisionId: participant.decision.id,
        parentId: null, // Seulement les commentaires de niveau supérieur
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Response.json({
      decision: participant.decision,
      participant: {
        id: participant.id,
        name: participant.externalName,
        hasVoted: participant.hasVoted,
      },
      existingVote,
      existingProposalVote,
      existingComments,
      existingOpinion,
      allOpinions,
    });
  } catch (error) {
    console.error('Error fetching decision for external vote:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération de la décision' },
      { status: 500 }
    );
  }
}

// POST /api/vote/[token] - Enregistrer le vote d'un participant externe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Récupérer le participant par son token
    const participant = await prisma.decisionParticipant.findUnique({
      where: { token },
      include: {
        decision: true,
      },
    });

    if (!participant) {
      return Response.json({ error: 'Lien invalide' }, { status: 404 });
    }

    // Vérifier que le token n'a pas expiré
    if (participant.tokenExpiresAt && new Date() > participant.tokenExpiresAt) {
      return Response.json({ error: 'Ce lien a expiré' }, { status: 410 });
    }

    // Vérifier que la décision est ouverte
    if (participant.decision.status !== 'OPEN') {
      return Response.json(
        { error: 'Cette décision n\'est plus ouverte au vote' },
        { status: 400 }
      );
    }

    const { decisionType } = participant.decision;

    // Traiter selon le type de décision
    if (decisionType === 'ADVICE_SOLICITATION') {
      // Sollicitation d'avis : créer ou mettre à jour l'avis du participant externe
      const { opinion } = body;

      if (!opinion || !opinion.trim()) {
        return Response.json(
          { error: 'L\'avis ne peut pas être vide' },
          { status: 400 }
        );
      }

      // Vérifier si l'avis existe déjà
      const existingOpinion = await prisma.opinionResponse.findFirst({
        where: {
          externalParticipantId: participant.id,
          decisionId: participant.decision.id,
        },
      });

      let savedOpinion;
      let isUpdate = false;

      if (existingOpinion) {
        // Mettre à jour l'avis existant
        savedOpinion = await prisma.opinionResponse.update({
          where: { id: existingOpinion.id },
          data: { content: opinion.trim() },
          include: {
            externalParticipant: {
              select: {
                id: true,
                externalName: true,
                externalEmail: true,
              },
            },
          },
        });
        isUpdate = true;
      } else {
        // Créer un nouvel avis
        savedOpinion = await prisma.opinionResponse.create({
          data: {
            content: opinion.trim(),
            decisionId: participant.decision.id,
            externalParticipantId: participant.id,
          },
          include: {
            externalParticipant: {
              select: {
                id: true,
                externalName: true,
                externalEmail: true,
              },
            },
          },
        });

        // Marquer le participant comme ayant voté (ici, "voté" signifie "donné un avis")
        await prisma.decisionParticipant.update({
          where: { id: participant.id },
          data: { hasVoted: true },
        });
      }

      return Response.json({
        opinion: savedOpinion,
        isUpdate,
        message: isUpdate ? 'Votre avis a été mis à jour' : 'Votre avis a été enregistré',
      });
    } else if (decisionType === 'MAJORITY') {
      // Vote pour une proposition
      const { proposalId } = body;

      if (!proposalId) {
        return Response.json(
          { error: 'L\'ID de la proposition est requis' },
          { status: 400 }
        );
      }

      // Vérifier que la proposition appartient à cette décision
      const proposal = await prisma.proposal.findFirst({
        where: {
          id: proposalId,
          decisionId: participant.decision.id,
        },
      });

      if (!proposal) {
        return Response.json(
          { error: 'Proposition non trouvée' },
          { status: 404 }
        );
      }

      // Supprimer le vote existant s'il y en a un (pour permettre la modification)
      await prisma.proposalVote.deleteMany({
        where: {
          externalParticipantId: participant.id,
          decisionId: participant.decision.id,
        },
      });

      // Créer le nouveau vote
      const vote = await prisma.proposalVote.create({
        data: {
          proposalId,
          decisionId: participant.decision.id,
          externalParticipantId: participant.id,
        },
      });

      // Marquer le participant comme ayant voté
      await prisma.decisionParticipant.update({
        where: { id: participant.id },
        data: { hasVoted: true },
      });

      return Response.json({ vote, message: 'Vote enregistré avec succès' });
    } else {
      // Vote nuancé (CONSENSUS, CONSENT, etc.)
      const { value, comment } = body;

      // Pour CONSENSUS, le vote et le commentaire sont tous deux optionnels
      // Mais au moins l'un des deux doit être fourni
      if (decisionType === 'CONSENSUS') {
        if (!value && !comment) {
          return Response.json(
            { error: 'Veuillez fournir un vote et/ou un commentaire' },
            { status: 400 }
          );
        }

        let vote = null;
        let createdComment = null;

        // Créer ou mettre à jour le vote si fourni
        if (value) {
          const weight = getVoteWeight(value);

          // Supprimer le vote existant s'il y en a un
          await prisma.vote.deleteMany({
            where: {
              externalParticipantId: participant.id,
              decisionId: participant.decision.id,
            },
          });

          // Créer le nouveau vote
          vote = await prisma.vote.create({
            data: {
              value,
              weight,
              decisionId: participant.decision.id,
              externalParticipantId: participant.id,
            },
          });

          // Marquer le participant comme ayant voté
          await prisma.decisionParticipant.update({
            where: { id: participant.id },
            data: { hasVoted: true },
          });
        }

        // Créer un commentaire dans la discussion si fourni
        if (comment && comment.trim()) {
          createdComment = await prisma.comment.create({
            data: {
              content: comment.trim(),
              decisionId: participant.decision.id,
              externalParticipantId: participant.id,
            },
          });
        }

        return Response.json({
          vote,
          comment: createdComment,
          message: vote && createdComment
            ? 'Vote et commentaire enregistrés avec succès'
            : vote
            ? 'Vote enregistré avec succès'
            : 'Commentaire enregistré avec succès',
        });
      } else {
        // Pour les autres types (CONSENT, etc.), le vote est obligatoire
        if (!value) {
          return Response.json(
            { error: 'La valeur du vote est requise' },
            { status: 400 }
          );
        }

        // Calculer le poids du vote
        const weight = getVoteWeight(value);

        // Supprimer le vote existant s'il y en a un (pour permettre la modification)
        await prisma.vote.deleteMany({
          where: {
            externalParticipantId: participant.id,
            decisionId: participant.decision.id,
          },
        });

        // Créer le nouveau vote
        const vote = await prisma.vote.create({
          data: {
            value,
            weight,
            decisionId: participant.decision.id,
            externalParticipantId: participant.id,
          },
        });

        // Marquer le participant comme ayant voté
        await prisma.decisionParticipant.update({
          where: { id: participant.id },
          data: { hasVoted: true },
        });

        return Response.json({ vote, message: 'Vote enregistré avec succès' });
      }
    }
  } catch (error) {
    console.error('Error recording external vote:', error);
    return Response.json(
      { error: 'Erreur lors de l\'enregistrement du vote' },
      { status: 500 }
    );
  }
}

// Fonction helper pour calculer le poids du vote
function getVoteWeight(value: string): number {
  const weights: { [key: string]: number } = {
    STRONG_SUPPORT: 3,
    SUPPORT: 2,
    WEAK_SUPPORT: 1,
    ABSTAIN: 0,
    WEAK_OPPOSE: -1,
    OPPOSE: -2,
    STRONG_OPPOSE: -3,
    BLOCK: -10,
    // Pour CONSENSUS
    AGREE: 3,
    DISAGREE: -3,
  };

  return weights[value] || 0;
}
