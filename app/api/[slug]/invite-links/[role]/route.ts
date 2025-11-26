import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkUserPermission } from "@/lib/organization"

// DELETE /api/[slug]/invite-links/[role] - Révoquer un lien
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; role: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { slug, role } = await params

    // Valider le rôle
    if (!["MEMBER", "ADMIN"].includes(role)) {
      return Response.json(
        { error: "Rôle invalide. Doit être MEMBER ou ADMIN" },
        { status: 400 }
      )
    }

    // Récupérer l'organisation
    const organization = await prisma.organization.findUnique({
      where: { slug },
    })

    if (!organization) {
      return Response.json(
        { error: "Organisation introuvable" },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur est ADMIN ou OWNER
    await checkUserPermission(organization.id, session.user.id)

    // Désactiver le lien
    const result = await prisma.organizationInviteLink.updateMany({
      where: {
        organizationId: organization.id,
        role,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    if (result.count === 0) {
      return Response.json(
        { error: "Aucun lien actif trouvé pour ce rôle" },
        { status: 404 }
      )
    }

    return Response.json({ success: true, message: "Lien révoqué avec succès" })
  } catch (error: any) {
    console.error("Erreur lors de la révocation du lien:", error)
    return Response.json(
      { error: error.message || "Erreur serveur" },
      { status: error.message?.includes("permission") ? 403 : 500 }
    )
  }
}
