/**
 * API pour gérer les questions de clarification (décisions par consentement)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/organizations/[slug]/decisions/[decisionId]/clarifications
 * Récupère toutes les questions de clarification pour une décision
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

    // Récupérer les questions avec leurs réponses
    const questions = await prisma.clarificationQuestion.findMany({
      where: { decisionId },
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
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching clarifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[slug]/decisions/[decisionId]/clarifications
 * Crée ou modifie une question de clarification
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
    const { questionText, questionId } = body

    if (!questionText || questionText.trim() === '') {
      return NextResponse.json({ error: 'Le texte de la question est requis' }, { status: 400 })
    }

    // Vérifier que la décision existe et est de type CONSENT
    const decision = await prisma.decision.findUnique({
      where: { id: decisionId },
      include: {
        participants: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!decision) {
      return NextResponse.json({ error: 'Décision introuvable' }, { status: 404 })
    }

    if (decision.decisionType !== 'CONSENT') {
      return NextResponse.json({ error: 'Cette fonctionnalité est réservée aux décisions par consentement' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est participant
    if (decision.participants.length === 0 && decision.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas participant à cette décision' }, { status: 403 })
    }

    // Si questionId est fourni, on modifie une question existante
    if (questionId) {
      const existingQuestion = await prisma.clarificationQuestion.findUnique({
        where: { id: questionId },
      })

      if (!existingQuestion) {
        return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
      }

      if (existingQuestion.questionerId !== session.user.id) {
        return NextResponse.json({ error: 'Vous ne pouvez modifier que vos propres questions' }, { status: 403 })
      }

      const updatedQuestion = await prisma.clarificationQuestion.update({
        where: { id: questionId },
        data: {
          questionText,
          updatedAt: new Date(),
        },
        include: {
          questioner: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      return NextResponse.json({ question: updatedQuestion })
    }

    // Créer une nouvelle question
    const question = await prisma.clarificationQuestion.create({
      data: {
        decisionId,
        questionText,
        questionerId: session.user.id,
      },
      include: {
        questioner: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating clarification:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
