import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { validatePassword } from "@/lib/password-validation"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, confirmPassword } = body

    if (!token || !password || !confirmPassword) {
      return Response.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      )
    }

    // Vérifier que les deux mots de passe correspondent
    if (password !== confirmPassword) {
      return Response.json(
        { error: "Les deux mots de passe ne correspondent pas" },
        { status: 400 }
      )
    }

    // Valider la force du mot de passe
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return Response.json(
        { error: passwordValidation.errors.join(". ") },
        { status: 400 }
      )
    }

    // Vérifier que le token existe et n'est pas expiré
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken) {
      return Response.json(
        { error: "Le lien de réinitialisation est invalide" },
        { status: 400 }
      )
    }

    if (resetToken.expiresAt < new Date()) {
      // Supprimer le token expiré
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      })

      return Response.json(
        { error: "Le lien de réinitialisation a expiré. Veuillez faire une nouvelle demande." },
        { status: 400 }
      )
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Mettre à jour le mot de passe de l'utilisateur
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    })

    // Supprimer le token utilisé
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    })

    // Optionnel : Supprimer tous les autres tokens de cet utilisateur
    await prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId }
    })

    return Response.json({
      message: "Votre mot de passe a été réinitialisé avec succès"
    })
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error)
    return Response.json(
      { error: "Une erreur est survenue lors de la réinitialisation du mot de passe" },
      { status: 500 }
    )
  }
}
