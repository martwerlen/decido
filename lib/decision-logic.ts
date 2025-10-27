// Types temporaires en attendant la regénération du client Prisma
enum DecisionType {
  CONSENSUS = 'CONSENSUS',
  CONSENT = 'CONSENT',
  MAJORITY = 'MAJORITY',
  SUPERMAJORITY = 'SUPERMAJORITY',
  WEIGHTED_VOTE = 'WEIGHTED_VOTE',
  ADVISORY = 'ADVISORY',
}

enum VoteValue {
  STRONG_SUPPORT = 'STRONG_SUPPORT',
  SUPPORT = 'SUPPORT',
  WEAK_SUPPORT = 'WEAK_SUPPORT',
  ABSTAIN = 'ABSTAIN',
  WEAK_OPPOSE = 'WEAK_OPPOSE',
  OPPOSE = 'OPPOSE',
  STRONG_OPPOSE = 'STRONG_OPPOSE',
  BLOCK = 'BLOCK',
}

enum DecisionResult {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * Calcule le résultat d'une décision en fonction de son type et des votes
 */
export function calculateDecisionResult(
  decisionType: DecisionType,
  votes: Array<{ value: VoteValue; weight: number }>,
  totalEligibleVoters: number
): DecisionResult {
  const voteCount = votes.length

  // Pas assez de votes
  if (voteCount === 0) {
    return DecisionResult.WITHDRAWN
  }

  switch (decisionType) {
    case DecisionType.CONSENSUS:
      // Unanimité requise - tous doivent être en support fort
      const allStrongSupport = votes.every(v => v.value === VoteValue.STRONG_SUPPORT)
      return allStrongSupport ? DecisionResult.APPROVED : DecisionResult.REJECTED

    case DecisionType.CONSENT:
      // Pas d'objection majeure - un seul BLOCK suffit à bloquer
      const hasBlock = votes.some(v => v.value === VoteValue.BLOCK)
      if (hasBlock) return DecisionResult.BLOCKED

      const hasStrongOppose = votes.some(v => v.value === VoteValue.STRONG_OPPOSE)
      if (hasStrongOppose) return DecisionResult.REJECTED

      return DecisionResult.APPROVED

    case DecisionType.MAJORITY:
      // Majorité simple
      const supportVotes = votes.filter(v =>
        v.value === VoteValue.STRONG_SUPPORT ||
        v.value === VoteValue.SUPPORT ||
        v.value === VoteValue.WEAK_SUPPORT
      ).length
      const opposeVotes = votes.filter(v =>
        v.value === VoteValue.STRONG_OPPOSE ||
        v.value === VoteValue.OPPOSE ||
        v.value === VoteValue.WEAK_OPPOSE
      ).length

      return supportVotes > opposeVotes ? DecisionResult.APPROVED : DecisionResult.REJECTED

    case DecisionType.SUPERMAJORITY:
      // 2/3 requis
      const supportCount = votes.filter(v =>
        v.value === VoteValue.STRONG_SUPPORT ||
        v.value === VoteValue.SUPPORT ||
        v.value === VoteValue.WEAK_SUPPORT
      ).length

      return (supportCount / voteCount) >= (2/3)
        ? DecisionResult.APPROVED
        : DecisionResult.REJECTED

    case DecisionType.WEIGHTED_VOTE:
      // Score pondéré avec poids
      const weightedScore = votes.reduce((sum, vote) => {
        const voteWeight = getVoteWeight(vote.value)
        return sum + (voteWeight * vote.weight)
      }, 0)

      return weightedScore > 0 ? DecisionResult.APPROVED : DecisionResult.REJECTED

    case DecisionType.ADVISORY:
      // Consultatif - toujours approuvé, c'est informatif
      return DecisionResult.APPROVED

    default:
      return DecisionResult.WITHDRAWN
  }
}

/**
 * Convertit une valeur de vote en poids numérique
 */
export function getVoteWeight(value: VoteValue): number {
  const weights: Record<VoteValue, number> = {
    [VoteValue.STRONG_SUPPORT]: 3,
    [VoteValue.SUPPORT]: 2,
    [VoteValue.WEAK_SUPPORT]: 1,
    [VoteValue.ABSTAIN]: 0,
    [VoteValue.WEAK_OPPOSE]: -1,
    [VoteValue.OPPOSE]: -2,
    [VoteValue.STRONG_OPPOSE]: -3,
    [VoteValue.BLOCK]: -10, // Poids très négatif pour un blocage
  }
  return weights[value] || 0
}

/**
 * Détermine si un utilisateur peut encore voter
 */
export function canUserVote(
  decisionStatus: string,
  userHasVoted: boolean
): boolean {
  return decisionStatus === 'OPEN' && !userHasVoted
}

/**
 * Formate le résultat de décision en texte lisible
 */
export function formatDecisionResult(result: DecisionResult | null): string {
  if (!result) return 'En attente'

  const labels: Record<DecisionResult, string> = {
    [DecisionResult.APPROVED]: 'Approuvée',
    [DecisionResult.REJECTED]: 'Rejetée',
    [DecisionResult.BLOCKED]: 'Bloquée',
    [DecisionResult.WITHDRAWN]: 'Retirée',
  }

  return labels[result] || 'Inconnu'
}
