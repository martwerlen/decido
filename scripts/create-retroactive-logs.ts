/**
 * Script pour créer des logs rétroactifs pour les décisions existantes
 *
 * Ce script crée un log "CREATED" pour chaque décision existante dans la base de données.
 * Exécuter avec: npx ts-node scripts/create-retroactive-logs.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Création des logs rétroactifs pour les décisions existantes...\n');

  try {
    // Récupérer toutes les décisions existantes
    const decisions = await prisma.decision.findMany({
      select: {
        id: true,
        title: true,
        creatorId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`📊 ${decisions.length} décisions trouvées\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const decision of decisions) {
      try {
        // Vérifier si un log existe déjà pour cette décision
        const existingLog = await prisma.decisionLog.findFirst({
          where: {
            decisionId: decision.id,
            eventType: 'CREATED',
          },
        });

        if (existingLog) {
          console.log(`⏭️  Décision "${decision.title}" - Log déjà existant, skip`);
          skipCount++;
          continue;
        }

        // Créer un log CREATED avec la date de création de la décision
        await prisma.decisionLog.create({
          data: {
            decisionId: decision.id,
            eventType: 'CREATED',
            actorId: decision.creatorId,
            createdAt: decision.createdAt, // Utiliser la date de création de la décision
          },
        });

        console.log(`✅ Décision "${decision.title}" - Log créé avec succès`);
        successCount++;
      } catch (error) {
        console.error(`❌ Erreur pour la décision "${decision.title}":`, error);
        errorCount++;
      }
    }

    console.log('\n📈 Résumé:');
    console.log(`   ✅ Logs créés: ${successCount}`);
    console.log(`   ⏭️  Logs déjà existants: ${skipCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    console.log(`   📊 Total: ${decisions.length}`);
    console.log('\n✨ Script terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
