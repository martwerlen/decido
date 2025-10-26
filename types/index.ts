import {
  DecisionType,
  DecisionStatus,
  DecisionResult,
  VoteValue,
  MemberRole
} from '@prisma/client'

export {
  DecisionType,
  DecisionStatus,
  DecisionResult,
  VoteValue,
  MemberRole,
}

// Types utiles pour l'application
export type DecisionWithRelations = {
  id: string
  title: string
  description: string
  decisionType: DecisionType
  status: DecisionStatus
  result: DecisionResult | null
  creator: {
    id: string
    name: string | null
    email: string
  }
  votes: {
    id: string
    value: VoteValue
    weight: number
    user: {
      id: string
      name: string | null
    }
  }[]
  _count?: {
    votes: number
    comments: number
  }
}

export type VoteStats = {
  total: number
  distribution: Record<VoteValue, number>
  weightedScore?: number
}
