/**
 * API pour garder la proposition initiale (décisions par consentement)
 * Uniquement le créateur peut faire cette action, pendant le stade AMENDEMENTS
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendConsentStageNotification } from '@/lib/consent-notifications'
import { calculateConsentStageTimings } from '@/lib/consent-logic'
import { ConsentStepMode } from '@/types/enums'
import { logConsentProposalKept } from '@/lib/decision-logger'

/**
 * PATCH /api/organizations/[slug]/decisions/[decisionId]/consent-keep
 * Garder la proposition initiale et passer au stade OBJECTIONS
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
        participants: {
          select: {
            userId: true,
            externalEmail: true,
            externalName: true,
            user: { select: { email: true, name: true } },
          },
        },
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

    // Mettre à jour la décision
    const updatedDecision = await prisma.decision.update({
      where: { id: decisionId },
      data: {
        consentAmendmentAction: 'KEPT',
        consentCurrentStage: 'OBJECTIONS',
        updatedAt: new Date(),
      },
    })

    // Logger l'événement
    await logConsentProposalKept(
      decisionId,
      session.user.id,
      session.user.name || session.user.email || 'Créateur'
    )

    // Envoyer les notifications à tous les participants
    if (decision.startDate && decision.endDate && decision.consentStepMode) {
      const timings = calculateConsentStageTimings(
        decision.startDate,
        decision.endDate,
        decision.consentStepMode as ConsentStepMode
      )

      const participantsToNotify = decision.participants
        .map(p => ({
          email: p.userId ? p.user?.email : p.externalEmail,
          name: p.userId ? p.user?.name : p.externalName,
        }))
        .filter(p => p.email && p.name) as Array<{ email: string; name: string | null }>

      await sendConsentStageNotification({
        participants: participantsToNotify,
        stage: 'OBJECTIONS',
        decision: {
          id: decision.id,
          title: decision.title,
          initialProposal: decision.initialProposal,
          proposal: null, // Pas de proposition amendée
          organizationSlug: decision.organization.slug,
        },
        creator: {
          name: decision.creator.name,
        },
        stageEndDate: timings.objections.endDate,
      })
    }

    return NextResponse.json({ decision: updatedDecision })
  } catch (error) {
    console.error('Error keeping proposal:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
