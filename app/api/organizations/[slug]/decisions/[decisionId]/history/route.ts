import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ConsensusVoteValueLabels, DecisionStatusLabels, ConsentObjectionStatusLabels } from '@/types/enums';

// GET /api/organizations/[slug]/decisions/[decisionId]/history - Récupère l'historique d'une décision
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
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
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

    // Récupérer tous les logs de la décision
    const logs = await prisma.decisionLog.findMany({
      where: {
        decisionId,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Plus récent en haut
      },
    });

    // Formater les logs pour l'affichage
    const formattedLogs = logs.map((log) => {
      const actorName = log.actor?.name || log.actorName || log.actorEmail || 'Système';
      let message = '';

      switch (log.eventType) {
        case 'CREATED':
          message = `${actorName} a créé la décision`;
          break;

        case 'STATUS_CHANGED':
          if (log.oldValue && log.newValue) {
            const oldStatusLabel = DecisionStatusLabels[log.oldValue as keyof typeof DecisionStatusLabels] || log.oldValue;
            const newStatusLabel = DecisionStatusLabels[log.newValue as keyof typeof DecisionStatusLabels] || log.newValue;
            message = `${actorName} a changé le statut de "${oldStatusLabel}" à "${newStatusLabel}"`;
          } else {
            message = `${actorName} a changé le statut`;
          }
          break;

        case 'CLOSED':
          message = `${actorName} a fermé la décision`;
          break;

        case 'REOPENED':
          message = `${actorName} a rouvert la décision`;
          break;

        case 'TITLE_UPDATED':
          if (log.oldValue && log.newValue) {
            message = `${actorName} a modifié le titre de "${log.oldValue}" à "${log.newValue}"`;
          } else {
            message = `${actorName} a modifié le titre`;
          }
          break;

        case 'DESCRIPTION_UPDATED':
          message = `${actorName} a modifié la description`;
          break;

        case 'CONTEXT_UPDATED':
          message = `${actorName} a modifié le contexte`;
          break;

        case 'DEADLINE_UPDATED':
          if (log.oldValue && log.newValue) {
            const oldDate = new Date(log.oldValue).toLocaleDateString('fr-FR');
            const newDate = new Date(log.newValue).toLocaleDateString('fr-FR');
            message = `${actorName} a modifié la date limite de ${oldDate} à ${newDate}`;
          } else if (log.newValue) {
            const newDate = new Date(log.newValue).toLocaleDateString('fr-FR');
            message = `${actorName} a défini la date limite au ${newDate}`;
          } else {
            message = `${actorName} a modifié la date limite`;
          }
          break;

        case 'PROPOSAL_AMENDED':
          message = `${actorName} a amendé la proposition`;
          break;

        case 'PARTICIPANT_ADDED':
          message = `${actorName} a ajouté un participant`;
          break;

        case 'PARTICIPANT_REMOVED':
          message = `${actorName} a retiré un participant`;
          break;

        case 'VOTE_RECORDED':
          // Pour le consensus, afficher le détail du vote
          if (decision.decisionType === 'CONSENSUS' && log.metadata) {
            try {
              const metadata = JSON.parse(log.metadata);
              if (metadata.voteValue) {
                const voteLabel = ConsensusVoteValueLabels[metadata.voteValue as keyof typeof ConsensusVoteValueLabels] || metadata.voteValue;
                message = `${actorName} a voté ${voteLabel}`;
              } else {
                message = `${actorName} a voté`;
              }
            } catch {
              message = `${actorName} a voté`;
            }
          } else {
            // Pour les autres types, anonyme
            message = 'Un vote a été enregistré';
          }
          break;

        case 'VOTE_UPDATED':
          // Pour le consensus, afficher le changement de vote
          if (decision.decisionType === 'CONSENSUS' && log.oldValue && log.newValue) {
            const oldVoteLabel = ConsensusVoteValueLabels[log.oldValue as keyof typeof ConsensusVoteValueLabels] || log.oldValue;
            const newVoteLabel = ConsensusVoteValueLabels[log.newValue as keyof typeof ConsensusVoteValueLabels] || log.newValue;
            message = `${actorName} a changé son vote de ${oldVoteLabel} à ${newVoteLabel}`;
          } else if (decision.decisionType === 'CONSENSUS') {
            message = `${actorName} a modifié son vote`;
          } else {
            // Pour les autres types, anonyme
            message = 'Un vote a été modifié';
          }
          break;

        case 'COMMENT_ADDED':
          message = `${actorName} a commenté`;
          break;

        case 'OPINION_SUBMITTED':
          message = `${actorName} a partagé son avis sur la décision`;
          break;

        case 'OPINION_UPDATED':
          message = `${actorName} a mis à jour son avis sur la décision`;
          break;

        case 'FINAL_DECISION_MADE':
          message = `${actorName} a validé la décision finale`;
          break;

        // CONSENT events
        case 'CONSENT_QUESTION_POSTED':
          message = `${actorName} a posé une question`;
          break;

        case 'CONSENT_QUESTION_ANSWERED':
          message = `${actorName} a répondu`;
          break;

        case 'CONSENT_OPINION_SUBMITTED':
          message = `${actorName} a donné son avis`;
          break;

        case 'CONSENT_PROPOSAL_AMENDED':
          message = `${actorName} a amendé la proposition`;
          break;

        case 'CONSENT_PROPOSAL_KEPT':
          message = `${actorName} a gardé la proposition telle quelle`;
          break;

        case 'CONSENT_PROPOSAL_WITHDRAWN':
          message = `${actorName} a retiré la proposition`;
          break;

        case 'CONSENT_POSITION_RECORDED':
          if (log.metadata) {
            try {
              const metadata = JSON.parse(log.metadata);
              const positionLabel = ConsentObjectionStatusLabels[metadata.position as keyof typeof ConsentObjectionStatusLabels] || metadata.position;
              if (metadata.position === 'OBJECTION' && metadata.objectionText) {
                message = `${actorName} a émis une objection : "${metadata.objectionText}"`;
              } else {
                message = `${actorName} - ${positionLabel}`;
              }
            } catch {
              message = `${actorName} a enregistré sa position`;
            }
          } else {
            message = `${actorName} a enregistré sa position`;
          }
          break;

        case 'CONSENT_POSITION_UPDATED':
          if (log.oldValue && log.newValue && log.metadata) {
            try {
              const oldPositionLabel = ConsentObjectionStatusLabels[log.oldValue as keyof typeof ConsentObjectionStatusLabels] || log.oldValue;
              const newPositionLabel = ConsentObjectionStatusLabels[log.newValue as keyof typeof ConsentObjectionStatusLabels] || log.newValue;
              const metadata = JSON.parse(log.metadata);
              if (log.newValue === 'OBJECTION' && metadata.objectionText) {
                message = `${actorName} a changé sa position de "${oldPositionLabel}" à objection : "${metadata.objectionText}"`;
              } else {
                message = `${actorName} a changé sa position de "${oldPositionLabel}" à "${newPositionLabel}"`;
              }
            } catch {
              message = `${actorName} a modifié sa position`;
            }
          } else {
            message = `${actorName} a modifié sa position`;
          }
          break;

        case 'CONSENT_DECISION_FINALIZED':
          if (log.metadata) {
            try {
              const metadata = JSON.parse(log.metadata);
              const { noObjection = 0, noPosition = 0, objection = 0 } = metadata;
              message = `Décision finalisée : ${noObjection} consentement${noObjection > 1 ? 's' : ''}, ${noPosition} abstention${noPosition > 1 ? 's' : ''}, ${objection} objection${objection > 1 ? 's' : ''}`;
            } catch {
              message = 'Décision finalisée';
            }
          } else {
            message = 'Décision finalisée';
          }
          break;

        default:
          message = `${actorName} - ${log.eventType}`;
      }

      return {
        id: log.id,
        eventType: log.eventType,
        message,
        createdAt: log.createdAt,
        actorId: log.actorId,
        actorName,
      };
    });

    return Response.json({ logs: formattedLogs });
  } catch (error) {
    console.error('Error fetching decision history:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    );
  }
}
