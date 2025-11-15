/**
 * Service de logging pour l'historique des décisions
 *
 * Ce module fournit des fonctions pour enregistrer tous les événements
 * liés aux décisions dans la table DecisionLog.
 */

import { prisma } from '@/lib/prisma';
import { DecisionLogEventType } from '@/types/enums';

export interface LogDecisionEventParams {
  decisionId: string;
  eventType: DecisionLogEventType;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Enregistre un événement dans l'historique d'une décision
 */
export async function logDecisionEvent({
  decisionId,
  eventType,
  actorId = null,
  actorName = null,
  actorEmail = null,
  oldValue = null,
  newValue = null,
  metadata = null,
}: LogDecisionEventParams): Promise<void> {
  try {
    await prisma.decisionLog.create({
      data: {
        decisionId,
        eventType,
        actorId,
        actorName,
        actorEmail,
        oldValue,
        newValue,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du log de décision:', error);
    // On ne veut pas faire échouer l'opération principale si le log échoue
  }
}

/**
 * Log la création d'une décision
 */
export async function logDecisionCreated(
  decisionId: string,
  creatorId: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CREATED',
    actorId: creatorId,
  });
}

/**
 * Log le lancement d'une décision
 */
export async function logDecisionLaunched(
  decisionId: string,
  actorId: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'LAUNCHED',
    actorId,
    oldValue: 'DRAFT',
    newValue: 'OPEN',
  });
}

/**
 * Log un changement de statut
 */
export async function logDecisionStatusChanged(
  decisionId: string,
  actorId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'STATUS_CHANGED',
    actorId,
    oldValue: oldStatus,
    newValue: newStatus,
  });
}

/**
 * Log une fermeture de décision
 */
export async function logDecisionClosed(
  decisionId: string,
  actorId: string,
  reason?: 'deadline_reached' | 'all_voted' | 'manual'
): Promise<void> {
  const metadata = reason ? { reason } : null;
  await logDecisionEvent({
    decisionId,
    eventType: 'CLOSED',
    actorId,
    metadata,
  });
}

/**
 * Log une réouverture de décision
 */
export async function logDecisionReopened(
  decisionId: string,
  actorId: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'REOPENED',
    actorId,
  });
}

/**
 * Log une modification du titre
 */
export async function logDecisionTitleUpdated(
  decisionId: string,
  actorId: string,
  oldTitle: string,
  newTitle: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'TITLE_UPDATED',
    actorId,
    oldValue: oldTitle,
    newValue: newTitle,
  });
}

/**
 * Log une modification de la description
 */
export async function logDecisionDescriptionUpdated(
  decisionId: string,
  actorId: string,
  oldDescription: string,
  newDescription: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'DESCRIPTION_UPDATED',
    actorId,
    oldValue: oldDescription,
    newValue: newDescription,
  });
}

/**
 * Log une modification du contexte
 */
export async function logDecisionContextUpdated(
  decisionId: string,
  actorId: string,
  oldContext: string | null,
  newContext: string | null
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONTEXT_UPDATED',
    actorId,
    oldValue: oldContext,
    newValue: newContext,
  });
}

/**
 * Log une modification de la date limite
 */
export async function logDecisionDeadlineUpdated(
  decisionId: string,
  actorId: string,
  oldDeadline: Date | null,
  newDeadline: Date | null
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'DEADLINE_UPDATED',
    actorId,
    oldValue: oldDeadline?.toISOString() || null,
    newValue: newDeadline?.toISOString() || null,
  });
}

/**
 * Log un amendement de proposition (consensus)
 */
export async function logProposalAmended(
  decisionId: string,
  actorId: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'PROPOSAL_AMENDED',
    actorId,
  });
}

/**
 * Log l'ajout d'une conclusion
 */
export async function logConclusionAdded(
  decisionId: string,
  actorId: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONCLUSION_ADDED',
    actorId,
  });
}

/**
 * Log l'ajout d'un participant
 */
export async function logParticipantAdded(
  decisionId: string,
  actorId: string,
  participantName?: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'PARTICIPANT_ADDED',
    actorId,
    metadata: participantName ? { participantName } : null,
  });
}

/**
 * Log le retrait d'un participant
 */
export async function logParticipantRemoved(
  decisionId: string,
  actorId: string,
  participantName?: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'PARTICIPANT_REMOVED',
    actorId,
    metadata: participantName ? { participantName } : null,
  });
}

/**
 * Log un vote enregistré
 * Pour les votes anonymes (majorité), on ne passe pas d'informations sur le votant
 * Pour les votes publics (consensus), on passe les infos du votant
 */
export async function logVoteRecorded(
  decisionId: string,
  actorId?: string,
  actorName?: string,
  actorEmail?: string,
  voteValue?: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'VOTE_RECORDED',
    actorId,
    actorName,
    actorEmail,
    metadata: voteValue ? { voteValue } : null,
  });
}

/**
 * Log la modification d'un vote
 */
export async function logVoteUpdated(
  decisionId: string,
  actorId?: string,
  actorName?: string,
  actorEmail?: string,
  oldVoteValue?: string,
  newVoteValue?: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'VOTE_UPDATED',
    actorId,
    actorName,
    actorEmail,
    oldValue: oldVoteValue,
    newValue: newVoteValue,
  });
}

/**
 * Log l'ajout d'un commentaire
 */
export async function logCommentAdded(
  decisionId: string,
  actorId?: string,
  actorName?: string,
  actorEmail?: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'COMMENT_ADDED',
    actorId,
    actorName,
    actorEmail,
  });
}

/**
 * Log une question de clarification posée (CONSENT)
 */
export async function logConsentQuestionPosted(
  decisionId: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_QUESTION_POSTED',
    actorId,
    actorName,
  });
}

/**
 * Log une réponse à une question de clarification (CONSENT)
 */
export async function logConsentQuestionAnswered(
  decisionId: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_QUESTION_ANSWERED',
    actorId,
    actorName,
  });
}

/**
 * Log un avis donné (CONSENT)
 */
export async function logConsentOpinionSubmitted(
  decisionId: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_OPINION_SUBMITTED',
    actorId,
    actorName,
  });
}

/**
 * Log l'amendement d'une proposition (CONSENT)
 */
export async function logConsentProposalAmended(
  decisionId: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_PROPOSAL_AMENDED',
    actorId,
    actorName,
  });
}

/**
 * Log le maintien d'une proposition (CONSENT)
 */
export async function logConsentProposalKept(
  decisionId: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_PROPOSAL_KEPT',
    actorId,
    actorName,
  });
}

/**
 * Log le retrait d'une proposition (CONSENT)
 */
export async function logConsentProposalWithdrawn(
  decisionId: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_PROPOSAL_WITHDRAWN',
    actorId,
    actorName,
  });
}

/**
 * Log l'enregistrement d'une position (CONSENT - objections)
 */
export async function logConsentPositionRecorded(
  decisionId: string,
  actorId: string,
  actorName: string,
  position: string,
  objectionText?: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_POSITION_RECORDED',
    actorId,
    actorName,
    metadata: {
      position,
      objectionText: objectionText || null,
    },
  });
}

/**
 * Log la modification d'une position (CONSENT - objections)
 */
export async function logConsentPositionUpdated(
  decisionId: string,
  actorId: string,
  actorName: string,
  oldPosition: string,
  newPosition: string,
  objectionText?: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_POSITION_UPDATED',
    actorId,
    actorName,
    oldValue: oldPosition,
    newValue: newPosition,
    metadata: {
      objectionText: objectionText || null,
    },
  });
}

/**
 * Log la finalisation d'une décision CONSENT avec décompte
 */
export async function logConsentDecisionFinalized(
  decisionId: string,
  result: string,
  counts: {
    noObjection: number;
    noPosition: number;
    objection: number;
  }
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CONSENT_DECISION_FINALIZED',
    metadata: {
      result,
      ...counts,
    },
  });
}
