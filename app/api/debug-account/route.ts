import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")

    if (!email) {
      return Response.json({ error: "Email requis" }, { status: 400 })
    }

    console.log(`\n🔍 Analyse du compte: ${email}\n`)

    // 1. Récupérer les données utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!user) {
      return Response.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    const userData = {
      id: user.id,
      idLength: user.id.length,
      name: user.name || null,
      nameLength: user.name?.length || 0,
      email: user.email,
      emailLength: user.email.length,
      image: user.image || null,
      imageLength: user.image?.length || 0,
    }

    // 2. Organisations
    const organizations = user.organizations.map(membership => ({
      name: membership.organization.name,
      slug: membership.organization.slug,
      slugLength: membership.organization.slug.length,
      role: membership.role,
    }))

    // 3. Compter les décisions créées
    const decisionsCreated = await prisma.decision.count({
      where: { createdById: user.id }
    })

    // 4. Compter les votes
    const votesCount = await prisma.vote.count({
      where: { userId: user.id }
    })

    // 5. Compter les participations
    const participationsCount = await prisma.decisionParticipant.count({
      where: { userId: user.id }
    })

    // 6. Compter les commentaires
    const commentsCount = await prisma.comment.count({
      where: { userId: user.id }
    })

    // 7. Calculer la taille approximative du JWT
    const jwtData = {
      id: user.id,
      email: user.email,
      name: user.name,
      lastOrganizationSlug: user.organizations[0]?.organization.slug || null
    }
    const jwtSize = JSON.stringify(jwtData).length

    // 8. Vérifications
    const warnings = []
    if (user.id.length > 50) warnings.push(`ID utilisateur anormalement long (${user.id.length} caractères)`)
    if (user.name && user.name.length > 100) warnings.push(`Nom anormalement long (${user.name.length} caractères)`)
    if (user.email.length > 100) warnings.push(`Email anormalement long (${user.email.length} caractères)`)
    if (user.organizations.some(m => m.organization.slug.length > 100)) {
      warnings.push(`Un ou plusieurs slugs d'organisation anormalement longs`)
      user.organizations.forEach(m => {
        if (m.organization.slug.length > 100) {
          warnings.push(`  ${m.organization.name}: ${m.organization.slug.length} caractères`)
        }
      })
    }
    if (jwtSize > 1000) warnings.push(`JWT plus volumineux que la normale (${jwtSize} octets)`)

    return Response.json({
      user: userData,
      organizations,
      stats: {
        decisionsCreated,
        votesCount,
        participationsCount,
        commentsCount,
      },
      jwt: {
        size: jwtSize,
        data: jwtData,
      },
      warnings,
    })

  } catch (error: any) {
    console.error('Erreur lors de l\'analyse:', error)
    return Response.json(
      { error: error.message || "Erreur lors de l'analyse" },
      { status: 500 }
    )
  }
}
