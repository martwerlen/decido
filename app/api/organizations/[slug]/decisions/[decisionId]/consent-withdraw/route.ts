/**
 * API pour retirer la proposition (décisions par consentement)
 * Uniquement le créateur peut faire cette action, pendant le stade AMENDEMENTS
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logConsentProposalWithdrawn } from '@/lib/decision-logger'

/**
 * PATCH /api/organizations/[slug]/decisions/[decisionId]/consent-withdraw
 * Retirer la proposition et clôturer la décision
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const { decisionId } = await params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer la décision
    const decision = await prisma.decision.findUnique({
      where: { id: decisionId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, slug: true } },
      },
    })

    if (!decision) {
      return NextResponse.json({ error: 'Décision introuvable' }, { status: 404 })
    }

    if (decision.decisionType !== 'CONSENT') {
      return NextResponse.json({ error: 'Cette action est réservée aux décisions par consentement' }, { status: 400 })
    }

    if (decision.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Seul le créateur peut prendre cette décision' }, { status: 403 })
    }

    if (decision.consentCurrentStage !== 'AMENDEMENTS') {
      return NextResponse.json({ error: 'Cette action n\'est possible que pendant le stade AMENDEMENTS' }, { status: 400 })
    }

    // Mettre à jour la décision (clôture avec statut WITHDRAWN)
    const updatedDecision = await prisma.decision.update({
      where: { id: decisionId },
      data: {
        consentAmendmentAction: 'WITHDRAWN',
        status: 'CLOSED',
        result: 'WITHDRAWN',
        consentCurrentStage: 'TERMINEE',
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Logger l'événement
    await logConsentProposalWithdrawn(
      decisionId,
      session.user.id,
      session.user.name || session.user.email || 'Créateur'
    )

    // Pas de notification nécessaire, la décision est terminée

    return NextResponse.json({ decision: updatedDecision })
  } catch (error) {
    console.error('Error withdrawing proposal:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
