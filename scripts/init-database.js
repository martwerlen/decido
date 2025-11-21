#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Initialisation de la base de données SQLite...\n');

try {
  // Import better-sqlite3
  const Database = require('better-sqlite3');

  // Créer ou ouvrir la base de données
  const dbPath = path.join(__dirname, '..', 'dev.db');
  const db = new Database(dbPath);

  console.log(`📦 Base de données: ${dbPath}`);

  // Lire le fichier SQL
  const sqlPath = path.join(__dirname, 'create-tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Exécuter le SQL
  console.log('📝 Création des tables...');
  db.exec(sql);

  console.log('✅ Tables créées avec succès!\n');

  // Vérifier les tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('📋 Tables créées:');
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });

  db.close();
  console.log('\n✨ Base de données prête à être utilisée!');
  console.log('👉 Lancez maintenant: npm run dev\n');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
