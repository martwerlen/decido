/**
 * Types d'énumérations pour Decidoo
 *
 * Ces types remplacent les enums Prisma qui ne sont pas supportés par SQLite.
 * En base de données, ces valeurs sont stockées comme des champs TEXT.
 */

// Rôles des membres d'organisation
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export const MEMBER_ROLES: MemberRole[] = ['OWNER', 'ADMIN', 'MEMBER'];

export const MemberRoleLabels: Record<MemberRole, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
};

// Statuts d'invitation
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export const INVITATION_STATUSES: InvitationStatus[] = ['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'];

export const InvitationStatusLabels: Record<InvitationStatus, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
};

// Types de décisions
export type DecisionType =
  | 'CONSENSUS'       // Unanimité requise
  | 'CONSENT'         // Pas d'objection majeure
  | 'MAJORITY'        // Vote majoritaire simple
  | 'SUPERMAJORITY'   // Vote qualifié (2/3, 3/4...)
  | 'WEIGHTED_VOTE'   // Vote nuancé avec échelle
  | 'NUANCED_VOTE'    // Jugement majoritaire
  | 'ADVISORY';       // Consultatif

export const DECISION_TYPES: DecisionType[] = [
  'CONSENSUS',
  'CONSENT',
  'MAJORITY',
  'SUPERMAJORITY',
  'WEIGHTED_VOTE',
  'NUANCED_VOTE',
  'ADVISORY',
];

export const DecisionTypeLabels: Record<DecisionType, string> = {
  CONSENSUS: 'Consensus',
  CONSENT: 'Consentement (pas d\'objection)',
  MAJORITY: 'Majorité simple',
  SUPERMAJORITY: 'Super-majorité (2/3)',
  WEIGHTED_VOTE: 'Vote nuancé',
  NUANCED_VOTE: 'Vote nuancé',
  ADVISORY: 'Consultatif',
};

export const DecisionTypeDescriptions: Record<DecisionType, string> = {
  CONSENSUS: 'Tous les membres doivent être en accord',
  CONSENT: 'Aucun membre ne s\'oppose fortement',
  MAJORITY: 'Plus de la moitié des votes sont favorables',
  SUPERMAJORITY: 'Au moins 2/3 des votes sont favorables',
  WEIGHTED_VOTE: 'Vote avec échelle de préférence (-3 à +3)',
  NUANCED_VOTE: 'Chaque participant évalue toutes les propositions avec une mention',
  ADVISORY: 'Vote consultatif sans décision contraignante',
};

// Statuts de décision
export type DecisionStatus =
  | 'DRAFT'         // Brouillon
  | 'OPEN'          // En cours de vote
  | 'CLOSED'        // Vote terminé
  | 'IMPLEMENTED'   // Décision mise en œuvre
  | 'ARCHIVED';     // Archivée

export const DECISION_STATUSES: DecisionStatus[] = [
  'DRAFT',
  'OPEN',
  'CLOSED',
  'IMPLEMENTED',
  'ARCHIVED',
];

export const DecisionStatusLabels: Record<DecisionStatus, string> = {
  DRAFT: 'Brouillon',
  OPEN: 'En cours',
  CLOSED: 'Terminée',
  IMPLEMENTED: 'Mise en œuvre',
  ARCHIVED: 'Archivée',
};

// Résultats de décision
export type DecisionResult =
  | 'APPROVED'    // Approuvée
  | 'REJECTED'    // Rejetée
  | 'BLOCKED'     // Bloquée (objection en consentement)
  | 'WITHDRAWN';  // Retirée

export const DECISION_RESULTS: DecisionResult[] = [
  'APPROVED',
  'REJECTED',
  'BLOCKED',
  'WITHDRAWN',
];

export const DecisionResultLabels: Record<DecisionResult, string> = {
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  BLOCKED: 'Bloquée',
  WITHDRAWN: 'Retirée',
};

// Valeurs de vote
export type VoteValue =
  | 'STRONG_SUPPORT'    // ++ (poids +3)
  | 'SUPPORT'           // +  (poids +2)
  | 'WEAK_SUPPORT'      // ~+ (poids +1)
  | 'ABSTAIN'           // 0
  | 'WEAK_OPPOSE'       // ~- (poids -1)
  | 'OPPOSE'            // -  (poids -2)
  | 'STRONG_OPPOSE'     // -- (poids -3)
  | 'BLOCK';            // Veto (pour consentement)

export const VOTE_VALUES: VoteValue[] = [
  'STRONG_SUPPORT',
  'SUPPORT',
  'WEAK_SUPPORT',
  'ABSTAIN',
  'WEAK_OPPOSE',
  'OPPOSE',
  'STRONG_OPPOSE',
  'BLOCK',
];

export const VoteValueLabels: Record<VoteValue, string> = {
  STRONG_SUPPORT: 'Soutien fort (++)',
  SUPPORT: 'Soutien (+)',
  WEAK_SUPPORT: 'Soutien faible (~+)',
  ABSTAIN: 'Abstention (0)',
  WEAK_OPPOSE: 'Opposition faible (~-)',
  OPPOSE: 'Opposition (-)',
  STRONG_OPPOSE: 'Opposition forte (--)',
  BLOCK: 'Objection (veto)',
};

export const VoteValueWeights: Record<VoteValue, number> = {
  STRONG_SUPPORT: 3,
  SUPPORT: 2,
  WEAK_SUPPORT: 1,
  ABSTAIN: 0,
  WEAK_OPPOSE: -1,
  OPPOSE: -2,
  STRONG_OPPOSE: -3,
  BLOCK: 0, // Le bloc n'a pas de poids, il bloque la décision
};

// Helpers de validation
export function isValidMemberRole(role: string): role is MemberRole {
  return MEMBER_ROLES.includes(role as MemberRole);
}

export function isValidInvitationStatus(status: string): status is InvitationStatus {
  return INVITATION_STATUSES.includes(status as InvitationStatus);
}

export function isValidDecisionType(type: string): type is DecisionType {
  return DECISION_TYPES.includes(type as DecisionType);
}

export function isValidDecisionStatus(status: string): status is DecisionStatus {
  return DECISION_STATUSES.includes(status as DecisionStatus);
}

export function isValidDecisionResult(result: string): result is DecisionResult {
  return DECISION_RESULTS.includes(result as DecisionResult);
}

export function isValidVoteValue(value: string): value is VoteValue {
  return VOTE_VALUES.includes(value as VoteValue);
}

// Mode de vote
export type VotingMode = 'INVITED' | 'PUBLIC_LINK';

export const VOTING_MODES: VotingMode[] = ['INVITED', 'PUBLIC_LINK'];

export const VotingModeLabels: Record<VotingMode, string> = {
  INVITED: 'Sur invitation',
  PUBLIC_LINK: 'Lien public',
};

// Source d'invitation pour les participants
export type ParticipantInvitedVia = 'TEAM' | 'MANUAL' | 'EXTERNAL';

export const PARTICIPANT_INVITED_VIA: ParticipantInvitedVia[] = ['TEAM', 'MANUAL', 'EXTERNAL'];

export const ParticipantInvitedViaLabels: Record<ParticipantInvitedVia, string> = {
  TEAM: 'Via équipe',
  MANUAL: 'Ajouté manuellement',
  EXTERNAL: 'Externe (email)',
};

// Valeurs de vote pour consensus
export type ConsensusVoteValue = 'AGREE' | 'DISAGREE';

export const CONSENSUS_VOTE_VALUES: ConsensusVoteValue[] = ['AGREE', 'DISAGREE'];

export const ConsensusVoteValueLabels: Record<ConsensusVoteValue, string> = {
  AGREE: 'D\'accord',
  DISAGREE: 'Pas d\'accord',
};

// Helpers de validation
export function isValidVotingMode(mode: string): mode is VotingMode {
  return VOTING_MODES.includes(mode as VotingMode);
}

export function isValidParticipantInvitedVia(via: string): via is ParticipantInvitedVia {
  return PARTICIPANT_INVITED_VIA.includes(via as ParticipantInvitedVia);
}

export function isValidConsensusVoteValue(value: string): value is ConsensusVoteValue {
  return CONSENSUS_VOTE_VALUES.includes(value as ConsensusVoteValue);
}

// Types d'événements pour l'historique des décisions
export type DecisionLogEventType =
  // Cycle de vie
  | 'CREATED'                 // Décision créée
  | 'LAUNCHED'                // Décision lancée
  | 'STATUS_CHANGED'          // Changement de statut
  | 'CLOSED'                  // Décision fermée
  | 'REOPENED'                // Décision rouverte

  // Modifications par créateur
  | 'TITLE_UPDATED'           // Titre modifié
  | 'DESCRIPTION_UPDATED'     // Description modifiée
  | 'CONTEXT_UPDATED'         // Contexte modifié
  | 'DEADLINE_UPDATED'        // Date limite modifiée
  | 'PROPOSAL_AMENDED'        // Proposition amendée (consensus)
  | 'CONCLUSION_ADDED'        // Conclusion ajoutée

  // Participants
  | 'PARTICIPANT_ADDED'       // Participant ajouté
  | 'PARTICIPANT_REMOVED'     // Participant retiré

  // Actions des participants
  | 'VOTE_RECORDED'           // Vote enregistré
  | 'VOTE_UPDATED'            // Vote modifié
  | 'COMMENT_ADDED';          // Commentaire ajouté

export const DECISION_LOG_EVENT_TYPES: DecisionLogEventType[] = [
  'CREATED',
  'LAUNCHED',
  'STATUS_CHANGED',
  'CLOSED',
  'REOPENED',
  'TITLE_UPDATED',
  'DESCRIPTION_UPDATED',
  'CONTEXT_UPDATED',
  'DEADLINE_UPDATED',
  'PROPOSAL_AMENDED',
  'CONCLUSION_ADDED',
  'PARTICIPANT_ADDED',
  'PARTICIPANT_REMOVED',
  'VOTE_RECORDED',
  'VOTE_UPDATED',
  'COMMENT_ADDED',
];

export const DecisionLogEventTypeLabels: Record<DecisionLogEventType, string> = {
  CREATED: 'Décision créée',
  LAUNCHED: 'Décision lancée',
  STATUS_CHANGED: 'Statut modifié',
  CLOSED: 'Décision fermée',
  REOPENED: 'Décision rouverte',
  TITLE_UPDATED: 'Titre modifié',
  DESCRIPTION_UPDATED: 'Description modifiée',
  CONTEXT_UPDATED: 'Contexte modifié',
  DEADLINE_UPDATED: 'Date limite modifiée',
  PROPOSAL_AMENDED: 'Proposition amendée',
  CONCLUSION_ADDED: 'Conclusion ajoutée',
  PARTICIPANT_ADDED: 'Participant ajouté',
  PARTICIPANT_REMOVED: 'Participant retiré',
  VOTE_RECORDED: 'Vote enregistré',
  VOTE_UPDATED: 'Vote modifié',
  COMMENT_ADDED: 'Commentaire ajouté',
};

export function isValidDecisionLogEventType(type: string): type is DecisionLogEventType {
  return DECISION_LOG_EVENT_TYPES.includes(type as DecisionLogEventType);
}

// ============================================
// VOTE NUANCÉ 
// ============================================

// Échelles de mentions disponibles
export type NuancedScale = '3_LEVELS' | '5_LEVELS' | '7_LEVELS';

export const NUANCED_SCALES: NuancedScale[] = ['3_LEVELS', '5_LEVELS', '7_LEVELS'];

export const NuancedScaleLabels: Record<NuancedScale, string> = {
  '3_LEVELS': '3 niveaux',
  '5_LEVELS': '5 niveaux',
  '7_LEVELS': '7 niveaux',
};

// Mentions pour l'échelle à 3 niveaux
export type NuancedMention3 = 'GOOD' | 'PASSABLE' | 'INSUFFICIENT';

export const NUANCED_MENTIONS_3: NuancedMention3[] = ['GOOD', 'PASSABLE', 'INSUFFICIENT'];

export const NuancedMention3Labels: Record<NuancedMention3, string> = {
  GOOD: 'Pour',
  PASSABLE: 'Sans avis',
  INSUFFICIENT: 'Contre',
};

export const NuancedMention3Colors: Record<NuancedMention3, string> = {
  GOOD: '#10b981',      // green-500 - Pour (positif)
  PASSABLE: '#fbbf24',  // amber-400 - Sans avis (neutre)
  INSUFFICIENT: '#ef4444', // red-500 - Contre (négatif)
};

// Mentions pour l'échelle à 5 niveaux
export type NuancedMention5 = 'EXCELLENT' | 'GOOD' | 'PASSABLE' | 'INSUFFICIENT' | 'TO_REJECT';

export const NUANCED_MENTIONS_5: NuancedMention5[] = [
  'EXCELLENT',
  'GOOD',
  'PASSABLE',
  'INSUFFICIENT',
  'TO_REJECT',
];

export const NuancedMention5Labels: Record<NuancedMention5, string> = {
  EXCELLENT: 'Franchement pour',
  GOOD: 'Pour',
  PASSABLE: 'Sans avis',
  INSUFFICIENT: 'Contre',
  TO_REJECT: 'Franchement contre',
};

export const NuancedMention5Colors: Record<NuancedMention5, string> = {
  EXCELLENT: '#059669',   // green-600 - Franchement pour (vert foncé)
  GOOD: '#10b981',        // green-500 - Pour (vert clair)
  PASSABLE: '#fbbf24',    // amber-400 - Sans avis (jaune)
  INSUFFICIENT: '#f97316', // orange-500 - Contre (orange)
  TO_REJECT: '#ef4444',   // red-500 - Franchement contre (rouge)
};

// Mentions pour l'échelle à 7 niveaux
export type NuancedMention7 =
  | 'EXCELLENT'
  | 'VERY_GOOD'
  | 'GOOD'
  | 'FAIRLY_GOOD'         // DEPRECATED - conservé pour compatibilité
  | 'PASSABLE'
  | 'INSUFFICIENT'
  | 'VERY_INSUFFICIENT'   // NOUVEAU
  | 'TO_REJECT';

export const NUANCED_MENTIONS_7: NuancedMention7[] = [
  'EXCELLENT',
  'VERY_GOOD',
  'GOOD',
  'PASSABLE',
  'INSUFFICIENT',
  'VERY_INSUFFICIENT',
  'TO_REJECT',
];

export const NuancedMention7Labels: Record<NuancedMention7, string> = {
  EXCELLENT: 'Absolument pour',
  VERY_GOOD: 'Franchement pour',
  GOOD: 'Pour',
  FAIRLY_GOOD: 'Assez bien',  // DEPRECATED - ne devrait plus être utilisé
  PASSABLE: 'Sans avis',
  INSUFFICIENT: 'Contre',
  VERY_INSUFFICIENT: 'Franchement contre',
  TO_REJECT: 'Absolument contre',
};

export const NuancedMention7Colors: Record<NuancedMention7, string> = {
  EXCELLENT: '#047857',        // green-700 - Absolument pour (vert très foncé)
  VERY_GOOD: '#059669',        // green-600 - Franchement pour (vert foncé)
  GOOD: '#10b981',             // green-500 - Pour (vert moyen)
  FAIRLY_GOOD: '#eab308',      // yellow-500 - DEPRECATED
  PASSABLE: '#fbbf24',         // amber-400 - Sans avis (jaune)
  INSUFFICIENT: '#fb923c',     // orange-400 - Contre (orange clair)
  VERY_INSUFFICIENT: '#f97316', // orange-500 - Franchement contre (orange foncé)
  TO_REJECT: '#dc2626',        // red-600 - Absolument contre (rouge foncé)
};

// Type union pour toutes les mentions
export type NuancedMention = NuancedMention3 | NuancedMention5 | NuancedMention7;

// Helpers de validation
export function isValidNuancedScale(scale: string): scale is NuancedScale {
  return NUANCED_SCALES.includes(scale as NuancedScale);
}

export function isValidNuancedMention3(mention: string): mention is NuancedMention3 {
  return NUANCED_MENTIONS_3.includes(mention as NuancedMention3);
}

export function isValidNuancedMention5(mention: string): mention is NuancedMention5 {
  return NUANCED_MENTIONS_5.includes(mention as NuancedMention5);
}

export function isValidNuancedMention7(mention: string): mention is NuancedMention7 {
  return NUANCED_MENTIONS_7.includes(mention as NuancedMention7);
}

// Helper pour obtenir les mentions selon l'échelle
export function getMentionsForScale(scale: NuancedScale): string[] {
  switch (scale) {
    case '3_LEVELS':
      return NUANCED_MENTIONS_3;
    case '5_LEVELS':
      return NUANCED_MENTIONS_5;
    case '7_LEVELS':
      return NUANCED_MENTIONS_7;
    default:
      return [];
  }
}

// Helper pour obtenir les labels selon l'échelle
export function getMentionLabel(scale: NuancedScale, mention: string): string {
  switch (scale) {
    case '3_LEVELS':
      return NuancedMention3Labels[mention as NuancedMention3] || mention;
    case '5_LEVELS':
      return NuancedMention5Labels[mention as NuancedMention5] || mention;
    case '7_LEVELS':
      return NuancedMention7Labels[mention as NuancedMention7] || mention;
    default:
      return mention;
  }
}

// Helper pour obtenir les couleurs selon l'échelle
export function getMentionColor(scale: NuancedScale, mention: string): string {
  switch (scale) {
    case '3_LEVELS':
      return NuancedMention3Colors[mention as NuancedMention3] || '#6b7280';
    case '5_LEVELS':
      return NuancedMention5Colors[mention as NuancedMention5] || '#6b7280';
    case '7_LEVELS':
      return NuancedMention7Colors[mention as NuancedMention7] || '#6b7280';
    default:
      return '#6b7280';
  }
}

// Helper pour obtenir le rang d'une mention (0 = meilleure, N = pire)
export function getMentionRank(scale: NuancedScale, mention: string): number {
  const mentions = getMentionsForScale(scale);
  return mentions.indexOf(mention);
}
