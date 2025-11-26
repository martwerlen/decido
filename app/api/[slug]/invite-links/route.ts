import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkUserPermission } from "@/lib/organization"
import crypto from "crypto"

// GET /api/[slug]/invite-links - Récupérer les liens actifs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { slug } = await params

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

    // Récupérer les liens actifs
    const inviteLinks = await prisma.organizationInviteLink.findMany({
      where: {
        organizationId: organization.id,
        isActive: true,
      },
      select: {
        id: true,
        role: true,
        token: true,
        usageCount: true,
        maxUsage: true,
        createdAt: true,
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return Response.json({ inviteLinks })
  } catch (error: any) {
    console.error("Erreur lors de la récupération des liens:", error)
    return Response.json(
      { error: error.message || "Erreur serveur" },
      { status: error.message?.includes("permission") ? 403 : 500 }
    )
  }
}

// POST /api/[slug]/invite-links - Créer ou régénérer un lien
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { slug } = await params
    const body = await req.json()
    const { role } = body

    // Valider le rôle
    if (!role || !["MEMBER", "ADMIN"].includes(role)) {
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

    // Générer un token unique
    const token = crypto.randomBytes(32).toString("hex")

    // Désactiver l'ancien lien s'il existe
    await prisma.organizationInviteLink.updateMany({
      where: {
        organizationId: organization.id,
        role,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    // Créer le nouveau lien
    const inviteLink = await prisma.organizationInviteLink.create({
      data: {
        organizationId: organization.id,
        role,
        token,
        createdById: session.user.id,
      },
      select: {
        id: true,
        role: true,
        token: true,
        usageCount: true,
        maxUsage: true,
        createdAt: true,
      },
    })

    return Response.json({ inviteLink })
  } catch (error: any) {
    console.error("Erreur lors de la création du lien:", error)
    return Response.json(
      { error: error.message || "Erreur serveur" },
      { status: error.message?.includes("permission") ? 403 : 500 }
    )
  }
}
