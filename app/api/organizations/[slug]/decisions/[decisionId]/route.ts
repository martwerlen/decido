import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidDecisionType, isValidDecisionStatus } from '@/types/enums';
import {
  logDecisionTitleUpdated,
  logDecisionDescriptionUpdated,
  logDecisionContextUpdated,
  logDecisionDeadlineUpdated,
  logProposalAmended,
  logDecisionLaunched,
} from '@/lib/decision-logger';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

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

    // ===== CAS SPÉCIAL : Lancement d'un brouillon =====
    if (decision.status === 'DRAFT' && body.launch === true) {
      // Validation complète avant le lancement
      if (!decision.title || !decision.description) {
        return Response.json(
          { error: 'Le titre et la description sont requis pour lancer la décision' },
          { status: 400 }
        );
      }

      // Mettre à jour les champs si fournis
      const launchUpdateData: any = {
        status: 'OPEN',
        startDate: new Date(),
      };

      // Appliquer les mises à jour de champs si fournis dans body
      if (body.title !== undefined) launchUpdateData.title = body.title;
      if (body.description !== undefined) launchUpdateData.description = body.description;
      if (body.context !== undefined) launchUpdateData.context = body.context;
      if (body.endDate !== undefined) launchUpdateData.endDate = new Date(body.endDate);
      if (body.initialProposal !== undefined) {
        launchUpdateData.initialProposal = body.initialProposal;
        launchUpdateData.proposal = body.initialProposal;
      }

      // Mettre à jour la décision pour la lancer
      await prisma.decision.update({
        where: { id: decisionId },
        data: launchUpdateData,
      });

      // Logger le lancement
      await logDecisionLaunched(decisionId, session.user.id);

      // Envoyer les emails aux participants externes
      if (decision.votingMode === 'INVITED') {
        const externalParticipants = await prisma.decisionParticipant.findMany({
          where: {
            decisionId,
            externalEmail: { not: null },
          },
        });

        if (externalParticipants.length > 0) {
          console.log(`\n📧 === ENVOI EMAILS === ${externalParticipants.length} participant(s) externe(s)\n`);

          const emailPromises = externalParticipants.map(async (participant: any) => {
            const email = participant.externalEmail;
            const name = participant.externalName || 'Participant';
            const voteUrl = `${process.env.NEXTAUTH_URL}/vote/${participant.token}`;

            try {
              console.log(`📤 Envoi à ${email} (${name})`);

              const decisionTypeLabel = decision.decisionType === 'MAJORITY'
                ? 'Vote à la majorité'
                : decision.decisionType === 'CONSENSUS'
                ? 'Consensus'
                : decision.decisionType === 'ADVICE_SOLICITATION'
                ? 'Sollicitation d\'avis'
                : decision.decisionType === 'NUANCED_VOTE'
                ? 'Vote nuancé'
                : decision.decisionType;

              await sendEmail({
                to: email,
                subject: `Nouvelle décision: ${decision.title}`,
                html: `
                  <h2>Vous êtes invité à participer à une décision</h2>
                  <p>Bonjour ${name},</p>
                  <p>Vous êtes invité à participer à une décision :</p>
                  <h3>${decision.title}</h3>
                  <p>${decision.description}</p>
                  <p><strong>Type de décision :</strong> ${decisionTypeLabel}</p>
                  ${decision.endDate ? `<p><strong>Date limite :</strong> ${new Date(decision.endDate).toLocaleDateString('fr-FR')}</p>` : ''}
                  <p>
                    <a href="${voteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">
                      Participer à la décision
                    </a>
                  </p>
                  <p>Vous pouvez également cliquer sur ce lien : <a href="${voteUrl}">${voteUrl}</a></p>
                  ${decision.endDate ? `<p style="color: #666; font-size: 12px; margin-top: 20px;">Ce lien est personnel et expire le ${new Date(decision.endDate).toLocaleDateString('fr-FR')}.</p>` : ''}
                `,
              });
              console.log(`✅ Envoyé à ${email}`);
            } catch (error) {
              console.error(`❌ Erreur pour ${email}:`, error);
            }
          });

          await Promise.allSettled(emailPromises);
          console.log(`\n📧 === FIN ENVOI EMAILS ===\n`);
        }
      }

      // Récupérer la décision complète pour la réponse
      const launchedDecision = await prisma.decision.findUnique({
        where: { id: decisionId },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          team: true,
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          proposals: { orderBy: { order: 'asc' } },
          nuancedProposals: { orderBy: { order: 'asc' } },
        },
      });

      return Response.json({ decision: launchedDecision });
    }

    // ===== Si la décision est OPEN ou CLOSED, restrictions =====
    if (decision.status === 'OPEN' || decision.status === 'CLOSED') {
      // On peut modifier proposal pour le consensus
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

      // On peut modifier proposal pour ADVICE_SOLICITATION, mais seulement si aucun avis n'a été donné
      if (decision.decisionType === 'ADVICE_SOLICITATION' && body.proposal !== undefined) {
        // Compter les avis déjà donnés
        const opinionCount = await prisma.opinionResponse.count({
          where: {
            decisionId,
          },
        });

        if (opinionCount > 0) {
          return Response.json(
            { error: 'Vous ne pouvez plus modifier la proposition car des avis ont déjà été donnés' },
            { status: 400 }
          );
        }

        // Vérifier si la proposition a réellement changé
        if (body.proposal !== decision.proposal) {
          const updated = await prisma.decision.update({
            where: { id: decisionId },
            data: {
              proposal: body.proposal,
            },
          });

          // Logger la modification
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

    // ===== Mise à jour d'un brouillon (DRAFT) =====

    // Construire les données à mettre à jour
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.context !== undefined) updateData.context = body.context;
    if (body.endDate !== undefined) {
      if (body.endDate) {
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
      } else {
        updateData.endDate = null;
      }
    }
    if (body.initialProposal !== undefined) updateData.initialProposal = body.initialProposal;
    if (body.proposal !== undefined) updateData.proposal = body.proposal;
    if (body.votingMode !== undefined) updateData.votingMode = body.votingMode;
    if (body.teamId !== undefined) {
      if (body.teamId) {
        const team = await prisma.team.findFirst({
          where: {
            id: body.teamId,
            organizationId: organization.id,
          },
        });

        if (!team) {
          return Response.json(
            { error: 'Équipe non trouvée ou n\'appartient pas à l\'organisation' },
            { status: 400 }
          );
        }
        updateData.teamId = body.teamId;
      } else {
        updateData.teamId = null;
      }
    }

    // Changement de type de décision
    if (body.decisionType !== undefined && isValidDecisionType(body.decisionType)) {
      updateData.decisionType = body.decisionType;
    }

    // Champs spécifiques au mode PUBLIC_LINK
    if (body.publicSlug !== undefined) {
      if (body.publicSlug && body.publicSlug !== decision.publicSlug) {
        // Vérifier l'unicité du slug dans l'organisation
        const existingSlug = await prisma.decision.findFirst({
          where: {
            organizationId: organization.id,
            publicSlug: body.publicSlug,
            id: { not: decisionId },
          },
        });

        if (existingSlug) {
          return Response.json(
            { error: 'Ce slug est déjà utilisé dans cette organisation' },
            { status: 400 }
          );
        }
      }
      updateData.publicSlug = body.publicSlug;
    }

    // Champs spécifiques au vote nuancé
    if (body.nuancedScale !== undefined) updateData.nuancedScale = body.nuancedScale;
    if (body.nuancedWinnerCount !== undefined) updateData.nuancedWinnerCount = body.nuancedWinnerCount;

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

    // ===== Mise à jour des propositions pour MAJORITY =====
    if (body.proposals !== undefined && decision.decisionType === 'MAJORITY') {
      // Supprimer les anciennes propositions
      await prisma.proposal.deleteMany({
        where: { decisionId },
      });

      // Créer les nouvelles propositions
      if (body.proposals.length > 0) {
        await prisma.proposal.createMany({
          data: body.proposals.map((p: any, index: number) => ({
            decisionId,
            title: p.title,
            description: p.description || null,
            order: index,
          })),
        });
      }
    }

    // ===== Mise à jour des propositions pour NUANCED_VOTE =====
    if (body.nuancedProposals !== undefined && decision.decisionType === 'NUANCED_VOTE') {
      // Supprimer les anciennes propositions
      await prisma.nuancedProposal.deleteMany({
        where: { decisionId },
      });

      // Créer les nouvelles propositions
      if (body.nuancedProposals.length > 0) {
        await prisma.nuancedProposal.createMany({
          data: body.nuancedProposals.map((p: any, index: number) => ({
            decisionId,
            title: p.title,
            description: p.description || null,
            order: index,
          })),
        });
      }
    }

    // ===== Mise à jour des participants (mode INVITED uniquement) =====
    if (body.participants !== undefined && decision.votingMode === 'INVITED') {
      const { teamIds, memberIds, externalParticipants } = body.participants;

      // Supprimer tous les participants existants
      await prisma.decisionParticipant.deleteMany({
        where: { decisionId },
      });

      // Recréer les participants
      // 1. Ajouter le créateur
      await prisma.decisionParticipant.create({
        data: {
          decisionId,
          userId: session.user.id,
          invitedVia: 'MANUAL',
        },
      });

      // 2. Ajouter participants via teams
      if (teamIds && teamIds.length > 0) {
        for (const teamId of teamIds) {
          const teamMembers = await prisma.teamMember.findMany({
            where: { teamId },
            include: { organizationMember: true },
          });

          for (const teamMember of teamMembers) {
            if (teamMember.organizationMember.userId !== session.user.id) {
              await prisma.decisionParticipant.create({
                data: {
                  decisionId,
                  userId: teamMember.organizationMember.userId,
                  invitedVia: 'TEAM',
                },
              });
            }
          }
        }
      }

      // 3. Ajouter participants individuels
      if (memberIds && memberIds.length > 0) {
        for (const userId of memberIds) {
          if (userId !== session.user.id) {
            const existing = await prisma.decisionParticipant.findFirst({
              where: { decisionId, userId },
            });
            if (!existing) {
              await prisma.decisionParticipant.create({
                data: {
                  decisionId,
                  userId: userId,
                  invitedVia: 'MANUAL',
                },
              });
            }
          }
        }
      }

      // 4. Ajouter participants externes
      if (externalParticipants && externalParticipants.length > 0) {
        for (const external of externalParticipants) {
          const token = crypto.randomBytes(32).toString('hex');
          await prisma.decisionParticipant.create({
            data: {
              decisionId,
              userId: null,
              externalEmail: external.email,
              externalName: external.name,
              invitedVia: 'EXTERNAL',
              token,
              tokenExpiresAt: updated.endDate,
            },
          });
        }
      }
    }

    // Logger les modifications (seulement si on n'est pas en mode auto-save)
    if (!body.autoSave) {
      if (body.title !== undefined && body.title !== decision.title) {
        await logDecisionTitleUpdated(decisionId, session.user.id, decision.title, body.title);
      }
      if (body.description !== undefined && body.description !== decision.description) {
        await logDecisionDescriptionUpdated(decisionId, session.user.id, decision.description, body.description);
      }
      if (body.context !== undefined && body.context !== decision.context) {
        await logDecisionContextUpdated(decisionId, session.user.id, decision.context, body.context);
      }
      if (body.endDate !== undefined) {
        const newEndDate = body.endDate ? new Date(body.endDate) : null;
        const oldEndDate = decision.endDate;
        if (oldEndDate?.getTime() !== newEndDate?.getTime()) {
          await logDecisionDeadlineUpdated(decisionId, session.user.id, oldEndDate, newEndDate);
        }
      }
      if (body.proposal !== undefined && body.proposal !== decision.proposal) {
        await logProposalAmended(decisionId, session.user.id);
      }
    }

    // Récupérer la décision complète avec les relations mises à jour
    const finalDecision = await prisma.decision.findUnique({
      where: { id: decisionId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        team: true,
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        proposals: { orderBy: { order: 'asc' } },
        nuancedProposals: { orderBy: { order: 'asc' } },
      },
    });

    return Response.json({ decision: finalDecision });
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
