import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/invite-links/[token]/accept - Accepter une invitation et rejoindre l'organisation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json(
        { error: "Vous devez être connecté pour accepter cette invitation" },
        { status: 401 }
      )
    }

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

    // Vérifier si l'utilisateur est déjà membre de l'organisation
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: inviteLink.organizationId,
        },
      },
    })

    if (existingMember) {
      return Response.json(
        {
          error: "Vous êtes déjà membre de cette organisation",
          organizationSlug: inviteLink.organization.slug,
        },
        { status: 409 }
      )
    }

    // Ajouter l'utilisateur à l'organisation avec transaction
    const [member] = await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          userId: session.user.id,
          organizationId: inviteLink.organizationId,
          role: inviteLink.role,
        },
      }),
      // Incrémenter le compteur d'utilisation
      prisma.organizationInviteLink.update({
        where: { id: inviteLink.id },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      }),
    ])

    return Response.json({
      success: true,
      message: `Vous avez rejoint l'organisation ${inviteLink.organization.name}`,
      organization: inviteLink.organization,
      role: member.role,
    })
  } catch (error: any) {
    console.error("Erreur lors de l'acceptation de l'invitation:", error)
    return Response.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
