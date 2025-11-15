import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return Response.json(
        { error: "L'adresse email est requise" },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return Response.json(
        { error: "Aucun compte n'existe avec cette adresse email" },
        { status: 404 }
      )
    }

    // Vérifier le rate limiting : maximum 2 demandes dans la dernière heure
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentTokens = await prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: oneHourAgo
        }
      }
    })

    if (recentTokens >= 2) {
      return Response.json(
        { error: "Trop de demandes de réinitialisation. Veuillez réessayer dans une heure." },
        { status: 429 }
      )
    }

    // Générer un token unique
    const token = crypto.randomBytes(32).toString("hex")

    // Expiration dans 1 heure
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    // Créer le token de réinitialisation
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    })

    // Envoyer l'email de réinitialisation
    await sendPasswordResetEmail({
      to: user.email,
      userName: user.name || "Utilisateur",
      resetToken: token
    })

    return Response.json({
      message: "Un email de réinitialisation a été envoyé à votre adresse"
    })
  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error)
    return Response.json(
      { error: "Une erreur est survenue lors de la demande de réinitialisation" },
      { status: 500 }
    )
  }
}
