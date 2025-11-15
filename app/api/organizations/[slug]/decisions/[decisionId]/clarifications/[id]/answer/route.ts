/**
 * API pour répondre à une question de clarification
 * Seul le créateur de la décision peut répondre
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/organizations/[slug]/decisions/[decisionId]/clarifications/[id]/answer
 * Ajoute ou modifie la réponse à une question de clarification
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string; id: string }> }
) {
  try {
    const { decisionId, id } = await params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { answerText } = body

    if (!answerText || answerText.trim() === '') {
      return NextResponse.json({ error: 'Le texte de la réponse est requis' }, { status: 400 })
    }

    // Vérifier que la décision existe et que l'utilisateur est le créateur
    const decision = await prisma.decision.findUnique({
      where: { id: decisionId },
    })

    if (!decision) {
      return NextResponse.json({ error: 'Décision introuvable' }, { status: 404 })
    }

    if (decision.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Seul le créateur peut répondre aux questions' }, { status: 403 })
    }

    // Vérifier que la question existe et appartient à cette décision
    const question = await prisma.clarificationQuestion.findUnique({
      where: { id },
    })

    if (!question) {
      return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
    }

    if (question.decisionId !== decisionId) {
      return NextResponse.json({ error: 'Question non associée à cette décision' }, { status: 400 })
    }

    // Mettre à jour la réponse
    const updatedQuestion = await prisma.clarificationQuestion.update({
      where: { id },
      data: {
        answerText,
        answererId: session.user.id,
        answeredAt: question.answeredAt || new Date(), // Première réponse seulement
        updatedAt: new Date(),
      },
      include: {
        questioner: {
          select: { id: true, name: true, email: true },
        },
        externalQuestioner: {
          select: { id: true, externalName: true, externalEmail: true },
        },
        answerer: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ question: updatedQuestion })
  } catch (error) {
    console.error('Error answering clarification:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
