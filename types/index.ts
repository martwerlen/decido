// Types temporaires en attendant la regénération du client Prisma
export enum DecisionType {
  CONSENSUS = 'CONSENSUS',
  CONSENT = 'CONSENT',
  MAJORITY = 'MAJORITY',
  SUPERMAJORITY = 'SUPERMAJORITY',
  ADVISORY = 'ADVISORY',
}

export enum DecisionStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  IMPLEMENTED = 'IMPLEMENTED',
  ARCHIVED = 'ARCHIVED',
}

export enum DecisionResult {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum VoteValue {
  STRONG_SUPPORT = 'STRONG_SUPPORT',
  SUPPORT = 'SUPPORT',
  WEAK_SUPPORT = 'WEAK_SUPPORT',
  ABSTAIN = 'ABSTAIN',
  WEAK_OPPOSE = 'WEAK_OPPOSE',
  OPPOSE = 'OPPOSE',
  STRONG_OPPOSE = 'STRONG_OPPOSE',
  BLOCK = 'BLOCK',
}

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
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
