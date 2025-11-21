/**
 * Script pour créer automatiquement des décisions CONSENT de test
 * Usage: node scripts/seed-consent-decisions.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding des décisions CONSENT...\n');

  // 1. Trouver l'organisation APM
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { contains: 'APM' } },
        { slug: { contains: 'apm' } }
      ]
    },
  });

  if (!org) {
    console.error('❌ Organisation APM non trouvée');
    return;
  }
  console.log(`✅ Organisation trouvée: ${org.name} (${org.slug})`);

  // 2. Trouver Martin WERLEN
  const creator = await prisma.user.findFirst({
    where: {
      OR: [
        {
          AND: [
            { name: { contains: 'Martin' } },
            { email: { contains: 'werlen' } }
          ]
        },
        { email: { contains: 'martin@' } }
      ]
    },
  });

  if (!creator) {
    console.error('❌ Martin WERLEN non trouvé');
    return;
  }
  console.log(`✅ Créateur trouvé: ${creator.name} (${creator.email})`);

  // 3. Trouver les membres de l'organisation
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: true },
    take: 5,
  });

  if (members.length < 3) {
    console.error('❌ Pas assez de membres trouvés (minimum 3 requis)');
    return;
  }
  console.log(`✅ ${members.length} membres trouvés`);

  const participantIds = members
    .slice(0, 3)
    .map(m => m.userId)
    .filter(id => id !== null);

  if (participantIds.length < 3) {
    console.error('❌ Pas assez de participants valides');
    return;
  }

  console.log(`\n📝 IDs à utiliser:`);
  console.log(`   Organisation: ${org.id}`);
  console.log(`   Créateur: ${creator.id}`);
  console.log(`   Participant 1: ${participantIds[0]}`);
  console.log(`   Participant 2: ${participantIds[1]}`);
  console.log(`   Participant 3: ${participantIds[2]}`);

  // Lire le fichier SQL
  const sqlTemplate = fs.readFileSync('scripts/seed-consent-decisions.sql', 'utf8');

  // Remplacer les placeholders
  const sql = sqlTemplate
    .replace(/@ORG_ID/g, org.id)
    .replace(/@CREATOR_ID/g, creator.id)
    .replace(/@PARTICIPANT_1/g, participantIds[0])
    .replace(/@PARTICIPANT_2/g, participantIds[1])
    .replace(/@PARTICIPANT_3/g, participantIds[2]);

  // Sauvegarder le SQL généré
  const outputFile = 'scripts/seed-consent-decisions-generated.sql';
  fs.writeFileSync(outputFile, sql);
  console.log(`\n📄 SQL généré: ${outputFile}`);

  // Exécuter le SQL
  console.log('\n🚀 Exécution du SQL...');

  // Découper le SQL en commandes individuelles (simple split sur ';')
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');

  let successCount = 0;
  let errorCount = 0;

  for (const command of commands) {
    // Ignorer les commentaires SQL purs
    if (command.match(/^--/)) continue;

    try {
      await prisma.$executeRawUnsafe(command);
      successCount++;
    } catch (error) {
      console.error(`❌ Erreur sur commande:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Seeding terminé!`);
  console.log(`   ${successCount} commandes réussies`);
  if (errorCount > 0) {
    console.log(`   ${errorCount} erreurs`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur globale:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
