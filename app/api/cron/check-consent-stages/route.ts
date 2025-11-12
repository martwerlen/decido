/**
 * API route pour vérifier et mettre à jour les stades des décisions par consentement
 *
 * Cette route doit être appelée périodiquement par un cron job (toutes les 15 minutes recommandé)
 * pour détecter les changements de stade et envoyer les notifications appropriées.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentConsentStage, calculateConsentStageTimings, allParticipantsConsented, calculateConsentResult } from '@/lib/consent-logic'
import { sendConsentStageNotification } from '@/lib/consent-notifications'
import { ConsentStage, ConsentStepMode } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    // Vérifier le token d'autorisation
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`

    if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let processedCount = 0
    let notificationsCount = 0
    let closedCount = 0

    // Récupérer toutes les décisions CONSENT ouvertes
    const openConsentDecisions = await prisma.decision.findMany({
      where: {
        decisionType: 'CONSENT',
        status: 'OPEN',
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        organization: {
          select: { id: true, slug: true },
        },
        participants: {
          select: {
            id: true,
            userId: true,
            externalEmail: true,
            externalName: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        consentObjections: {
          select: {
            id: true,
            status: true,
            withdrawnAt: true,
          },
        },
      },
    })

    for (const decision of openConsentDecisions) {
      if (!decision.startDate || !decision.endDate || !decision.consentStepMode) {
        continue // Ignorer les décisions mal configurées
      }

      const now = new Date()
      const endDate = new Date(decision.endDate)

      // Calculer le stade actuel
      const calculatedStage = getCurrentConsentStage(
        decision.startDate,
        endDate,
        decision.consentStepMode as ConsentStepMode,
        decision.consentAmendmentAction
      )

      // Vérifier si le stade a changé
      if (calculatedStage !== decision.consentCurrentStage) {
        console.log(`📊 Decision ${decision.id}: Stage transition ${decision.consentCurrentStage} → ${calculatedStage}`)

        // Mettre à jour le stade en base
        await prisma.decision.update({
          where: { id: decision.id },
          data: {
            consentCurrentStage: calculatedStage,
            lastNotifiedStage: calculatedStage,
          },
        })

        // Envoyer les notifications selon le nouveau stade
        if (calculatedStage !== 'TERMINEE') {
          // Préparer la liste des participants à notifier
          const participantsToNotify = []

          for (const participant of decision.participants) {
            if (participant.userId && participant.user) {
              participantsToNotify.push({
                email: participant.user.email,
                name: participant.user.name,
              })
            } else if (participant.externalEmail && participant.externalName) {
              participantsToNotify.push({
                email: participant.externalEmail,
                name: participant.externalName,
              })
            }
          }

          // Calculer la date de fin du stade actuel
          const timings = calculateConsentStageTimings(
            decision.startDate,
            endDate,
            decision.consentStepMode as ConsentStepMode
          )

          let stageEndDate = endDate
          if (calculatedStage === 'CLARIFICATIONS' && timings.clarifications) {
            stageEndDate = timings.clarifications.endDate
          } else if (calculatedStage === 'AVIS' && timings.avis) {
            stageEndDate = timings.avis.endDate
          } else if (calculatedStage === 'CLARIFAVIS' && timings.clarifavis) {
            stageEndDate = timings.clarifavis.endDate
          } else if (calculatedStage === 'AMENDEMENTS') {
            stageEndDate = timings.amendements.endDate
          } else if (calculatedStage === 'OBJECTIONS') {
            stageEndDate = timings.objections.endDate
          }

          // Envoyer les emails (sauf pour AMENDEMENTS qui ne concerne que le créateur)
          if (calculatedStage === 'AMENDEMENTS') {
            // Notification uniquement au créateur
            await sendConsentStageNotification({
              participants: [{
                email: decision.creator.email,
                name: decision.creator.name,
              }],
              stage: calculatedStage as ConsentStage,
              decision: {
                id: decision.id,
                title: decision.title,
                initialProposal: decision.initialProposal,
                proposal: decision.proposal,
                organizationSlug: decision.organization.slug,
              },
              creator: {
                name: decision.creator.name,
              },
              stageEndDate,
            })
            notificationsCount++
          } else {
            // Notification à tous les participants
            await sendConsentStageNotification({
              participants: participantsToNotify,
              stage: calculatedStage as ConsentStage,
              decision: {
                id: decision.id,
                title: decision.title,
                initialProposal: decision.initialProposal,
                proposal: decision.proposal,
                organizationSlug: decision.organization.slug,
              },
              creator: {
                name: decision.creator.name,
              },
              stageEndDate,
            })
            notificationsCount++
          }
        }

        processedCount++
      }

      // Vérifier si la décision doit être clôturée automatiquement
      if (calculatedStage === 'OBJECTIONS') {
        // Vérifier si tous les participants ont consenti (clôture anticipée)
        const allConsented = allParticipantsConsented(
          decision.consentObjections,
          decision.participants.length
        )

        if (allConsented) {
          console.log(`✅ Decision ${decision.id}: All participants consented, closing early`)

          const result = calculateConsentResult(
            decision.consentObjections,
            decision.participants.length,
            decision.consentAmendmentAction
          )

          await prisma.decision.update({
            where: { id: decision.id },
            data: {
              status: 'CLOSED',
              result: result.result,
              consentCurrentStage: 'TERMINEE',
              decidedAt: new Date(),
            },
          })

          closedCount++
        }
      }

      // Vérifier si la deadline est atteinte
      if (now >= endDate && calculatedStage !== 'TERMINEE') {
        console.log(`⏰ Decision ${decision.id}: Deadline reached, closing automatically`)

        const result = calculateConsentResult(
          decision.consentObjections,
          decision.participants.length,
          decision.consentAmendmentAction
        )

        await prisma.decision.update({
          where: { id: decision.id },
          data: {
            status: 'CLOSED',
            result: result.result,
            consentCurrentStage: 'TERMINEE',
            decidedAt: now,
          },
        })

        closedCount++
      }
    }

    return NextResponse.json({
      success: true,
      processedCount,
      notificationsCount,
      closedCount,
      totalDecisions: openConsentDecisions.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error checking consent stages:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
