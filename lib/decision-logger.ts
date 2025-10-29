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
  actorId: string
): Promise<void> {
  await logDecisionEvent({
    decisionId,
    eventType: 'CLOSED',
    actorId,
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
