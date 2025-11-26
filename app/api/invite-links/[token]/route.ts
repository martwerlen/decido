import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/invite-links/[token] - Valider un token et récupérer les infos
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Récupérer le lien d'invitation
    const inviteLink = await prisma.organizationInviteLink.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
    })

    if (!inviteLink) {
      return Response.json(
        { error: "Lien d'invitation invalide ou expiré" },
        { status: 404 }
      )
    }

    // Vérifier si le lien est actif
    if (!inviteLink.isActive) {
      return Response.json(
        { error: "Ce lien d'invitation a été révoqué" },
        { status: 410 }
      )
    }

    // Vérifier si le lien a atteint la limite d'utilisation
    if (inviteLink.usageCount >= inviteLink.maxUsage) {
      return Response.json(
        { error: "Ce lien d'invitation a atteint sa limite d'utilisation" },
        { status: 410 }
      )
    }

    return Response.json({
      organization: inviteLink.organization,
      role: inviteLink.role,
      usageCount: inviteLink.usageCount,
      maxUsage: inviteLink.maxUsage,
    })
  } catch (error: any) {
    console.error("Erreur lors de la validation du token:", error)
    return Response.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
