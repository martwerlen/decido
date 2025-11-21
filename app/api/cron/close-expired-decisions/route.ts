import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logDecisionEvent } from "@/lib/decision-logger"

/**
 * Cron Job API: Fermer les décisions expirées
 *
 * Appelé automatiquement par le cron job Render toutes les heures.
 * Ferme toutes les décisions dont la deadline est passée.
 *
 * Sécurité: Requiert un Bearer token (CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification du cron job
    const authHeader = request.headers.get("authorization")
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (!authHeader || authHeader !== expectedAuth) {
      console.error("❌ Tentative d'accès non autorisée au cron job")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const now = new Date()
    console.log(`⏰ [${now.toISOString()}] Début de la fermeture des décisions expirées`)

    // Trouver toutes les décisions expirées
    const expiredDecisions = await prisma.decision.findMany({
      where: {
        status: "OPEN",
        endDate: {
          lte: now
        }
      },
      select: {
        id: true,
        title: true,
        endDate: true,
        organizationId: true,
        decisionType: true
      }
    })

    console.log(`📊 ${expiredDecisions.length} décision(s) expirée(s) trouvée(s)`)

    // Fermer chaque décision et logger l'événement
    const closedDecisions = []
    const errors = []

    for (const decision of expiredDecisions) {
      try {
        // Mettre à jour le statut
        await prisma.decision.update({
          where: { id: decision.id },
          data: { status: "CLOSED" }
        })

        // Logger l'événement (sans actorId car automatique)
        await logDecisionEvent({
          decisionId: decision.id,
          eventType: "CLOSED",
          metadata: {
            reason: "deadline_reached",
            closedAt: now.toISOString(),
            automaticClosure: true
          }
        })

        closedDecisions.push({
          id: decision.id,
          title: decision.title,
          endDate: decision.endDate
        })

        console.log(`✅ Décision fermée: "${decision.title}" (${decision.id})`)
      } catch (error) {
        console.error(`❌ Erreur lors de la fermeture de "${decision.title}":`, error)
        errors.push({
          decisionId: decision.id,
          title: decision.title,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      found: expiredDecisions.length,
      closed: closedDecisions.length,
      errors: errors.length,
      decisions: closedDecisions,
      failedDecisions: errors.length > 0 ? errors : undefined
    }

    console.log(`✅ Cron terminé: ${closedDecisions.length}/${expiredDecisions.length} décision(s) fermée(s)`)

    return NextResponse.json(summary)
  } catch (error) {
    console.error("❌ Erreur critique dans le cron job:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
