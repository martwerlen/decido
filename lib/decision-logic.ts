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

// ============================================
// JUGEMENT MAJORITAIRE (VOTE NUANCÉ)
// ============================================

export interface NuancedProposalResult {
  proposalId: string
  title: string
  majorityMention: string // La mention majoritaire (médiane)
  mentionProfile: Record<string, number> // Distribution des mentions
  rank: number // Classement (1 = gagnant)
  score: number // Score pour le départage (plus élevé = meilleur)
}

/**
 * Calcule la mention majoritaire (médiane) pour une proposition
 * @param mentions - Liste des mentions attribuées à la proposition
 * @param scale - Échelle utilisée pour le vote
 * @returns La mention majoritaire
 */
export function calculateMajorityMention(
  mentions: string[],
  scale: string
): string {
  if (mentions.length === 0) {
    // Si aucune mention, retourner la pire mention de l'échelle
    const allMentions = getMentionsForScale(scale)
    return allMentions[allMentions.length - 1]
  }

  // Trier les mentions par rang (0 = meilleure, N = pire)
  const sortedMentions = [...mentions].sort((a, b) => {
    return getMentionRank(scale, a) - getMentionRank(scale, b)
  })

  // Calculer la médiane
  const middleIndex = Math.floor(sortedMentions.length / 2)

  if (sortedMentions.length % 2 === 1) {
    // Nombre impair : prendre l'élément du milieu
    return sortedMentions[middleIndex]
  } else {
    // Nombre pair : prendre la pire des deux mentions centrales (plus conservateur)
    return sortedMentions[middleIndex]
  }
}

/**
 * Calcule le profil de mérite d'une proposition (distribution des mentions)
 */
export function calculateMentionProfile(
  mentions: string[],
  scale: string
): Record<string, number> {
  const allMentions = getMentionsForScale(scale)
  const profile: Record<string, number> = {}

  // Initialiser toutes les mentions à 0
  allMentions.forEach(mention => {
    profile[mention] = 0
  })

  // Compter les mentions
  mentions.forEach(mention => {
    if (profile[mention] !== undefined) {
      profile[mention]++
    }
  })

  return profile
}

/**
 * Détermine si une mention est positive, neutre ou négative
 */
function getMentionType(scale: string, mention: string): 'positive' | 'neutral' | 'negative' {
  const allMentions = getMentionsForScale(scale)
  const rank = getMentionRank(scale, mention)
  const neutralRank = Math.floor(allMentions.length / 2)

  if (rank < neutralRank) return 'positive'
  if (rank === neutralRank) return 'neutral'
  return 'negative'
}

/**
 * Calcule un score de départage pour les propositions
 * Le gagnant a le plus de mentions positives et le moins de mentions négatives
 * En cas d'égalité, on départage par les mentions les plus extrêmes
 */
export function calculateTiebreakerScore(
  mentions: string[],
  scale: string,
  depth: number = 0
): number {
  if (mentions.length === 0) {
    return 0
  }

  const allMentions = getMentionsForScale(scale)
  const mentionProfile = calculateMentionProfile(mentions, scale)

  // Compter les mentions positives et négatives
  let positiveCount = 0
  let negativeCount = 0

  allMentions.forEach(mention => {
    const type = getMentionType(scale, mention)
    const count = mentionProfile[mention] || 0

    if (type === 'positive') {
      positiveCount += count
    } else if (type === 'negative') {
      negativeCount += count
    }
  })

  // Score principal : différence entre positifs et négatifs (multiplié par un grand facteur)
  let score = (positiveCount - negativeCount) * 1000000

  // Départage par mentions extrêmes (des plus extrêmes vers les plus centrales)
  // Pour chaque niveau de mention (du plus extrême au plus central)
  const neutralRank = Math.floor(allMentions.length / 2)

  for (let distance = 0; distance < neutralRank; distance++) {
    const positiveRank = distance
    const negativeRank = allMentions.length - 1 - distance

    if (positiveRank < allMentions.length && negativeRank >= 0) {
      const positiveMention = allMentions[positiveRank]
      const negativeMention = allMentions[negativeRank]

      const positiveVotes = mentionProfile[positiveMention] || 0
      const negativeVotes = mentionProfile[negativeMention] || 0

      // Plus il y a de votes positifs extrêmes, mieux c'est
      // Plus il y a de votes négatifs extrêmes, moins bien c'est
      const levelScore = (positiveVotes - negativeVotes) * Math.pow(100, neutralRank - distance)
      score += levelScore
    }
  }

  return score
}

/**
 * Calcule les résultats du vote nuancé pour toutes les propositions
 * et les classe par mention majoritaire
 */
export function calculateNuancedVoteResults(
  proposals: Array<{
    id: string
    title: string
    mentions: string[] // Liste des mentions reçues
  }>,
  scale: string
): NuancedProposalResult[] {
  // Calculer les résultats pour chaque proposition
  const results: NuancedProposalResult[] = proposals.map(proposal => ({
    proposalId: proposal.id,
    title: proposal.title,
    majorityMention: calculateMajorityMention(proposal.mentions, scale),
    mentionProfile: calculateMentionProfile(proposal.mentions, scale),
    rank: 0, // Sera calculé après le tri
    score: calculateTiebreakerScore(proposal.mentions, scale),
  }))

  // Trier par score (basé sur mentions positives/négatives et départage)
  // Score plus élevé = meilleure proposition
  results.sort((a, b) => {
    return b.score - a.score
  })

  // Attribuer les rangs
  results.forEach((result, index) => {
    result.rank = index + 1
  })

  return results
}

/**
 * Helper pour obtenir les mentions selon l'échelle
 * (Wrapper pour la fonction dans enums.ts)
 */
function getMentionsForScale(scale: string): string[] {
  switch (scale) {
    case '3_LEVELS':
      return ['GOOD', 'PASSABLE', 'INSUFFICIENT']
    case '5_LEVELS':
      return ['EXCELLENT', 'GOOD', 'PASSABLE', 'INSUFFICIENT', 'TO_REJECT']
    case '7_LEVELS':
      return ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'PASSABLE', 'INSUFFICIENT', 'VERY_INSUFFICIENT', 'TO_REJECT']
    default:
      return []
  }
}

/**
 * Helper pour obtenir le rang d'une mention
 * (Wrapper pour la fonction dans enums.ts)
 */
function getMentionRank(scale: string, mention: string): number {
  const mentions = getMentionsForScale(scale)
  return mentions.indexOf(mention)
}
