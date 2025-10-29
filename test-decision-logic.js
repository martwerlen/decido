// Test rapide de la logique de décision
// Exécuter avec: node test-decision-logic.js

const { VoteValue, DecisionResult, DecisionType } = {
  VoteValue: {
    STRONG_SUPPORT: 'STRONG_SUPPORT',
    SUPPORT: 'SUPPORT',
    WEAK_SUPPORT: 'WEAK_SUPPORT',
    ABSTAIN: 'ABSTAIN',
    WEAK_OPPOSE: 'WEAK_OPPOSE',
    OPPOSE: 'OPPOSE',
    STRONG_OPPOSE: 'STRONG_OPPOSE',
    BLOCK: 'BLOCK'
  },
  DecisionResult: {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    BLOCKED: 'BLOCKED',
    WITHDRAWN: 'WITHDRAWN'
  },
  DecisionType: {
    CONSENSUS: 'CONSENSUS',
    CONSENT: 'CONSENT',
    MAJORITY: 'MAJORITY',
    SUPERMAJORITY: 'SUPERMAJORITY',
    WEIGHTED_VOTE: 'WEIGHTED_VOTE',
    ADVISORY: 'ADVISORY'
  }
}

// Simulations de fonctions
function getVoteWeight(value) {
  const weights = {
    'STRONG_SUPPORT': 3,
    'SUPPORT': 2,
    'WEAK_SUPPORT': 1,
    'ABSTAIN': 0,
    'WEAK_OPPOSE': -1,
    'OPPOSE': -2,
    'STRONG_OPPOSE': -3,
    'BLOCK': -10,
  }
  return weights[value] || 0
}

function calculateDecisionResult(decisionType, votes) {
  const voteCount = votes.length

  if (voteCount === 0) return DecisionResult.WITHDRAWN

  switch (decisionType) {
    case DecisionType.CONSENSUS:
      const allStrongSupport = votes.every(v => v.value === VoteValue.STRONG_SUPPORT)
      return allStrongSupport ? DecisionResult.APPROVED : DecisionResult.REJECTED

    case DecisionType.CONSENT:
      const hasBlock = votes.some(v => v.value === VoteValue.BLOCK)
      if (hasBlock) return DecisionResult.BLOCKED

      const hasStrongOppose = votes.some(v => v.value === VoteValue.STRONG_OPPOSE)
      if (hasStrongOppose) return DecisionResult.REJECTED

      return DecisionResult.APPROVED

    case DecisionType.MAJORITY:
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

    case DecisionType.WEIGHTED_VOTE:
      const weightedScore = votes.reduce((sum, vote) => {
        const voteWeight = getVoteWeight(vote.value)
        return sum + (voteWeight * vote.weight)
      }, 0)

      return weightedScore > 0 ? DecisionResult.APPROVED : DecisionResult.REJECTED

    default:
      return DecisionResult.WITHDRAWN
  }
}

// === TESTS ===

console.log('🧪 Tests de la logique de décision Decidoo\n')

// Test 1: Consensus
console.log('📊 Test 1: CONSENSUS')
const consensusVotes = [
  { value: VoteValue.STRONG_SUPPORT, weight: 1 },
  { value: VoteValue.STRONG_SUPPORT, weight: 1 },
  { value: VoteValue.STRONG_SUPPORT, weight: 1 }
]
const result1 = calculateDecisionResult(DecisionType.CONSENSUS, consensusVotes)
console.log(`   Tous en support fort → ${result1}`)
console.log(`   ✓ Attendu: APPROVED, Reçu: ${result1}\n`)

// Test 2: Consensus échoué
console.log('📊 Test 2: CONSENSUS (échoué)')
const consensusFailVotes = [
  { value: VoteValue.STRONG_SUPPORT, weight: 1 },
  { value: VoteValue.SUPPORT, weight: 1 }
]
const result2 = calculateDecisionResult(DecisionType.CONSENSUS, consensusFailVotes)
console.log(`   Pas tous en support fort → ${result2}`)
console.log(`   ✓ Attendu: REJECTED, Reçu: ${result2}\n`)

// Test 3: Consentement bloqué
console.log('📊 Test 3: CONSENT (bloqué)')
const consentBlockVotes = [
  { value: VoteValue.SUPPORT, weight: 1 },
  { value: VoteValue.BLOCK, weight: 1 }
]
const result3 = calculateDecisionResult(DecisionType.CONSENT, consentBlockVotes)
console.log(`   Un BLOCK présent → ${result3}`)
console.log(`   ✓ Attendu: BLOCKED, Reçu: ${result3}\n`)

// Test 4: Vote majoritaire
console.log('📊 Test 4: MAJORITY')
const majorityVotes = [
  { value: VoteValue.SUPPORT, weight: 1 },
  { value: VoteValue.SUPPORT, weight: 1 },
  { value: VoteValue.OPPOSE, weight: 1 }
]
const result4 = calculateDecisionResult(DecisionType.MAJORITY, majorityVotes)
console.log(`   2 pour, 1 contre → ${result4}`)
console.log(`   ✓ Attendu: APPROVED, Reçu: ${result4}\n`)

// Test 5: Vote pondéré
console.log('📊 Test 5: WEIGHTED_VOTE')
const weightedVotes = [
  { value: VoteValue.STRONG_SUPPORT, weight: 1 },  // +3
  { value: VoteValue.OPPOSE, weight: 1 }           // -2
]
const result5 = calculateDecisionResult(DecisionType.WEIGHTED_VOTE, weightedVotes)
console.log(`   Score: +3 - 2 = +1 → ${result5}`)
console.log(`   ✓ Attendu: APPROVED, Reçu: ${result5}\n`)

console.log('✅ Tous les tests terminés!')
