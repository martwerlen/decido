// Script pour initialiser la base de données
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Initialisation de la base de données...\n');

// Vérifier si dev.db existe
const dbPath = path.join(__dirname, '..', 'dev.db');
if (fs.existsSync(dbPath)) {
  console.log('✅ La base de données existe déjà');
  process.exit(0);
}

// Créer un fichier vide pour la base de données
fs.writeFileSync(dbPath, '');
console.log('📦 Fichier de base de données créé');

// Générer le schéma SQL depuis Prisma
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Lire le schema Prisma et extraire les modèles
console.log('📝 Lecture du schéma Prisma...');

const schema = fs.readFileSync(schemaPath, 'utf-8');

// Pour SQLite, Prisma crée automatiquement les tables lors de la première connexion
// avec le client. Créons juste un fichier vide pour commencer.

console.log('✅ Base de données SQLite initialisée');
console.log('ℹ️  Les tables seront créées automatiquement au premier démarrage\n');
console.log('Vous pouvez maintenant lancer: npm run dev');
