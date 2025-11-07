// Script de diagnostic pour analyser un compte utilisateur
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeAccount(email) {
  try {
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
      console.log('❌ Utilisateur non trouvé')
      return
    }

    console.log('👤 Données utilisateur:')
    console.log(`   ID: ${user.id} (longueur: ${user.id.length})`)
    console.log(`   Nom: ${user.name || 'null'} (longueur: ${user.name?.length || 0})`)
    console.log(`   Email: ${user.email} (longueur: ${user.email.length})`)
    console.log(`   Image: ${user.image || 'null'} (longueur: ${user.image?.length || 0})`)

    // 2. Organisations
    console.log(`\n🏢 Organisations (${user.organizations.length}):`)
    user.organizations.forEach(membership => {
      const org = membership.organization
      console.log(`   - ${org.name} (slug: ${org.slug}, longueur: ${org.slug.length})`)
      console.log(`     Role: ${membership.role}`)
    })

    // 3. Compter les décisions créées
    const decisionsCreated = await prisma.decision.count({
      where: { createdById: user.id }
    })
    console.log(`\n📋 Décisions créées: ${decisionsCreated}`)

    // 4. Compter les votes
    const votesCount = await prisma.vote.count({
      where: { userId: user.id }
    })
    console.log(`🗳️  Votes enregistrés: ${votesCount}`)

    // 5. Compter les participations
    const participationsCount = await prisma.decisionParticipant.count({
      where: { userId: user.id }
    })
    console.log(`👥 Participations: ${participationsCount}`)

    // 6. Compter les commentaires
    const commentsCount = await prisma.comment.count({
      where: { userId: user.id }
    })
    console.log(`💬 Commentaires: ${commentsCount}`)

    // 7. Calculer la taille approximative du JWT
    const jwtData = {
      id: user.id,
      email: user.email,
      name: user.name,
      lastOrganizationSlug: user.organizations[0]?.organization.slug || null
    }
    const jwtSize = JSON.stringify(jwtData).length
    console.log(`\n📊 Taille approximative du JWT: ${jwtSize} octets`)
    console.log(`   Données JWT:`, JSON.stringify(jwtData, null, 2))

    // 8. Vérifier s'il y a des données anormales
    console.log(`\n⚠️  Vérifications:`)
    if (user.id.length > 50) console.log(`   ❌ ID utilisateur anormalement long (${user.id.length} caractères)`)
    if (user.name && user.name.length > 100) console.log(`   ❌ Nom anormalement long (${user.name.length} caractères)`)
    if (user.email.length > 100) console.log(`   ❌ Email anormalement long (${user.email.length} caractères)`)
    if (user.organizations.some(m => m.organization.slug.length > 100)) {
      console.log(`   ❌ Un slug d'organisation est anormalement long`)
      user.organizations.forEach(m => {
        if (m.organization.slug.length > 100) {
          console.log(`      ${m.organization.name}: ${m.organization.slug.length} caractères`)
        }
      })
    }
    if (jwtSize > 1000) console.log(`   ⚠️  JWT plus volumineux que la normale (>${jwtSize} octets)`)

    console.log(`\n✅ Analyse terminée`)

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Lire l'email depuis les arguments
const email = process.argv[2]
if (!email) {
  console.error('Usage: node debug-account.js <email>')
  process.exit(1)
}

analyzeAccount(email)
