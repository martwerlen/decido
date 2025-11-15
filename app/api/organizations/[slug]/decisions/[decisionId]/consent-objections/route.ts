/**
 * API pour gérer les objections (décisions par consentement)
 * Uniquement pendant le stade OBJECTIONS
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  logConsentPositionRecorded,
  logConsentPositionUpdated,
  logConsentDecisionFinalized,
} from '@/lib/decision-logger'
import { ConsentObjectionStatusLabels } from '@/types/enums'

/**
 * GET /api/organizations/[slug]/decisions/[decisionId]/consent-objections
 * Récupère toutes les objections pour une décision
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const { decisionId } = await params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer les objections avec les informations des participants
    const objections = await prisma.consentObjection.findMany({
      where: { decisionId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        externalParticipant: {
          select: {
            id: true,
            externalName: true,
            externalEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ objections })
  } catch (error) {
    console.error('Error fetching objections:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[slug]/decisions/[decisionId]/consent-objections
 * Crée ou modifie une objection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const { decisionId } = await params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { status, objectionText, withdraw } = body

    // Valider le statut
    if (!['NO_OBJECTION', 'OBJECTION', 'NO_POSITION'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    // Si objection, le texte est requis
    if (status === 'OBJECTION' && (!objectionText || objectionText.trim() === '')) {
      return NextResponse.json({ error: 'Le texte de l\'objection est requis' }, { status: 400 })
    }

    // Vérifier que la décision existe et est de type CONSENT
    const decision = await prisma.decision.findUnique({
      where: { id: decisionId },
      include: {
        participants: {
          where: { userId: session.user.id },
        },
        consentObjections: true,
      },
    })

    if (!decision) {
      return NextResponse.json({ error: 'Décision introuvable' }, { status: 404 })
    }

    if (decision.decisionType !== 'CONSENT') {
      return NextResponse.json({ error: 'Cette fonctionnalité est réservée aux décisions par consentement' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est participant
    if (decision.participants.length === 0) {
      return NextResponse.json({ error: 'Vous n\'êtes pas participant à cette décision' }, { status: 403 })
    }

    // Vérifier que le stade est OBJECTIONS
    if (decision.consentCurrentStage !== 'OBJECTIONS') {
      return NextResponse.json({ error: 'Les objections ne peuvent être soumises que pendant le stade OBJECTIONS' }, { status: 400 })
    }

    // Vérifier que la décision est toujours ouverte
    if (decision.status !== 'OPEN') {
      return NextResponse.json({ error: 'Cette décision est clôturée' }, { status: 400 })
    }

    // Vérifier si une objection existe déjà pour cet utilisateur
    const existingObjection = decision.consentObjections.find(
      (obj) => obj.userId === session.user.id
    )

    let objection
    const userName = session.user.name || session.user.email || 'Participant'

    if (existingObjection) {
      // Sauvegarder le statut précédent pour le log
      const oldStatus = existingObjection.status

      // Mettre à jour l'objection existante
      objection = await prisma.consentObjection.update({
        where: { id: existingObjection.id },
        data: {
          status,
          objectionText: status === 'OBJECTION' ? objectionText : null,
          withdrawnAt: withdraw ? new Date() : null,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Logger la modification de position
      await logConsentPositionUpdated(
        decisionId,
        session.user.id,
        userName,
        oldStatus,
        status,
        status === 'OBJECTION' ? objectionText : undefined
      )
    } else {
      // Créer une nouvelle objection
      objection = await prisma.consentObjection.create({
        data: {
          decisionId,
          userId: session.user.id,
          status,
          objectionText: status === 'OBJECTION' ? objectionText : null,
          withdrawnAt: withdraw ? new Date() : null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Logger l'enregistrement de la position
      await logConsentPositionRecorded(
        decisionId,
        session.user.id,
        userName,
        status,
        status === 'OBJECTION' ? objectionText : undefined
      )
    }

    // Marquer le participant comme ayant voté
    await prisma.decisionParticipant.updateMany({
      where: {
        decisionId,
        userId: session.user.id,
      },
      data: {
        hasVoted: true,
      },
    })

    // Vérifier si tous les participants ont voté et s'il n'y a aucune objection
    // Si oui, clôturer automatiquement la décision
    const allParticipants = await prisma.decisionParticipant.count({
      where: { decisionId },
    })

    const allObjections = await prisma.consentObjection.findMany({
      where: { decisionId },
      select: { status: true },
    })

    // Vérifier si tous les participants ont enregistré une objection
    if (allObjections.length === allParticipants) {
      // Vérifier s'il n'y a aucune vraie objection (seulement NO_OBJECTION et NO_POSITION)
      const hasRealObjection = allObjections.some((obj) => obj.status === 'OBJECTION')

      if (!hasRealObjection) {
        // Calculer le décompte
        const counts = {
          noObjection: allObjections.filter((obj) => obj.status === 'NO_OBJECTION').length,
          noPosition: allObjections.filter((obj) => obj.status === 'NO_POSITION').length,
          objection: 0,
        }

        // Clôturer automatiquement la décision
        await prisma.decision.update({
          where: { id: decisionId },
          data: {
            status: 'CLOSED',
            consentCurrentStage: 'TERMINEE',
            result: 'APPROVED',
            decidedAt: new Date(),
          },
        })

        // Logger la finalisation de la décision
        await logConsentDecisionFinalized(decisionId, 'APPROVED', counts)
      }
    }

    return NextResponse.json({ objection })
  } catch (error) {
    console.error('Error creating/updating objection:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
