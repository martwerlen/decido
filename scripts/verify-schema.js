#!/usr/bin/env node

/**
 * Script de vérification de la cohérence entre le schéma Prisma et la base de données
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');

if (!fs.existsSync(dbPath)) {
  console.error('❌ La base de données dev.db n\'existe pas');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('🔍 Vérification de la cohérence du schéma...\n');

// Tables attendues selon le schéma Prisma
const expectedTables = [
  'users',
  'accounts',
  'sessions',
  'organizations',
  'organization_members',
  'non_user_members',
  'invitations',
  'teams',
  'team_members',
  'decisions',
  'votes',
  'comments',
  'tags',
  'decision_tags',
  '_prisma_migrations'
];

// Récupérer les tables existantes
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
).all().map(row => row.name);

console.log('📋 Tables trouvées:', tables.length);
console.log('📋 Tables attendues:', expectedTables.length);
console.log('');

// Vérifier les tables manquantes
const missingTables = expectedTables.filter(t => !tables.includes(t));
if (missingTables.length > 0) {
  console.log('❌ Tables manquantes:');
  missingTables.forEach(t => console.log(`   - ${t}`));
  console.log('');
}

// Vérifier les tables supplémentaires
const extraTables = tables.filter(t => !expectedTables.includes(t) && !t.startsWith('sqlite_'));
if (extraTables.length > 0) {
  console.log('⚠️  Tables supplémentaires (non dans le schéma):');
  extraTables.forEach(t => console.log(`   - ${t}`));
  console.log('');
}

// Vérification de la structure des tables critiques
console.log('🔎 Vérification de la structure des tables critiques:\n');

const criticalTables = {
  'users': ['id', 'email', 'name', 'password', 'emailVerified', 'image', 'createdAt', 'updatedAt'],
  'decisions': ['id', 'title', 'description', 'context', 'decisionType', 'status', 'result', 'resultDetails', 'creatorId', 'organizationId', 'teamId'],
  'votes': ['id', 'value', 'weight', 'comment', 'userId', 'decisionId', 'createdAt', 'updatedAt'],
  'comments': ['id', 'content', 'userId', 'decisionId', 'parentId', 'createdAt', 'updatedAt']
};

let allValid = true;

for (const [tableName, expectedColumns] of Object.entries(criticalTables)) {
  if (!tables.includes(tableName)) {
    console.log(`❌ ${tableName}: Table manquante`);
    allValid = false;
    continue;
  }

  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const columnNames = columns.map(col => col.name);

  const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));

  if (missingColumns.length > 0) {
    console.log(`❌ ${tableName}: Colonnes manquantes: ${missingColumns.join(', ')}`);
    allValid = false;
  } else {
    console.log(`✅ ${tableName}: Structure valide (${columnNames.length} colonnes)`);
  }
}

console.log('');

// Vérifier les migrations
const migrations = db.prepare('SELECT * FROM _prisma_migrations ORDER BY started_at').all();
console.log(`📦 Migrations appliquées: ${migrations.length}`);
migrations.forEach(m => {
  console.log(`   - ${m.migration_name} (${m.finished_at ? 'appliquée' : 'en cours'})`);
});

console.log('');

if (allValid && missingTables.length === 0) {
  console.log('✅ La base de données est cohérente avec le schéma Prisma');
  process.exit(0);
} else {
  console.log('❌ Incohérences détectées entre la base de données et le schéma Prisma');
  process.exit(1);
}

db.close();
