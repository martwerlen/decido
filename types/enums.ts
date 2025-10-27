/**
 * Types d'énumérations pour Decido
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
  | 'ADVISORY';       // Consultatif

export const DECISION_TYPES: DecisionType[] = [
  'CONSENSUS',
  'CONSENT',
  'MAJORITY',
  'SUPERMAJORITY',
  'WEIGHTED_VOTE',
  'ADVISORY',
];

export const DecisionTypeLabels: Record<DecisionType, string> = {
  CONSENSUS: 'Consensus (unanimité)',
  CONSENT: 'Consentement (pas d\'objection)',
  MAJORITY: 'Majorité simple',
  SUPERMAJORITY: 'Super-majorité (2/3)',
  WEIGHTED_VOTE: 'Vote nuancé',
  ADVISORY: 'Consultatif',
};

export const DecisionTypeDescriptions: Record<DecisionType, string> = {
  CONSENSUS: 'Tous les membres doivent être en accord',
  CONSENT: 'Aucun membre ne s\'oppose fortement',
  MAJORITY: 'Plus de la moitié des votes sont favorables',
  SUPERMAJORITY: 'Au moins 2/3 des votes sont favorables',
  WEIGHTED_VOTE: 'Vote avec échelle de préférence (-3 à +3)',
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
