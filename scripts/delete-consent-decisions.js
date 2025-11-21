/**
 * Script pour supprimer toutes les décisions CONSENT avec better-sqlite3
 * Usage: node scripts/delete-consent-decisions.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const db = new Database(dbPath);

async function main() {
  console.log('🗑️  Suppression des décisions CONSENT...\n');

  try {
    // 1. Trouver l'organisation APM
    const org = db.prepare(`
      SELECT * FROM organizations
      WHERE name LIKE '%APM%' OR slug LIKE '%apm%'
      LIMIT 1
    `).get();

    if (!org) {
      console.error('❌ Organisation APM non trouvée');
      process.exit(1);
    }
    console.log(`✅ Organisation trouvée: ${org.name} (${org.slug})`);

    // 2. Compter les décisions CONSENT
    const count = db.prepare(`
      SELECT COUNT(*) as count
      FROM decisions
      WHERE organizationId = ? AND decisionType = 'CONSENT'
    `).get(org.id);

    console.log(`📊 ${count.count} décisions CONSENT trouvées\n`);

    if (count.count === 0) {
      console.log('✨ Aucune décision CONSENT à supprimer');
      db.close();
      return;
    }

    // 3. Supprimer toutes les décisions CONSENT
    // Les relations en cascade supprimeront automatiquement:
    // - decision_participants
    // - clarification_questions
    // - opinion_responses
    // - consent_objections
    // - etc.
    const deleteStmt = db.prepare(`
      DELETE FROM decisions
      WHERE organizationId = ? AND decisionType = 'CONSENT'
    `);

    const result = deleteStmt.run(org.id);

    console.log(`✅ ${result.changes} décisions CONSENT supprimées`);
    console.log('✅ Tous les participants, questions, avis et objections associés ont été supprimés');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }

  db.close();
}

main().catch((e) => {
  console.error('❌ Erreur globale:', e);
  db.close();
  process.exit(1);
});
