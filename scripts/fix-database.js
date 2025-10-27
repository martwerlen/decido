#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

console.log('🔧 Correction de la base de données...\n');

try {
  const dbPath = path.join(__dirname, '..', 'dev.db');
  const db = new Database(dbPath);

  console.log('📋 Tables actuelles dans la base de données:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });

  console.log('\n🔄 Renommage des tables pour correspondre au schéma Prisma...\n');

  // Mapping des tables à renommer
  const tablesToRename = [
    { old: 'User', new: 'users' },
    { old: 'Account', new: 'accounts' },
    { old: 'Session', new: 'sessions' },
    { old: 'Organization', new: 'organizations' },
    { old: 'OrganizationMember', new: 'organization_members' },
    { old: 'NonUserMember', new: 'non_user_members' },
    { old: 'Invitation', new: 'invitations' },
    { old: 'Team', new: 'teams' },
    { old: 'TeamMember', new: 'team_members' },
    { old: 'Decision', new: 'decisions' },
    { old: 'Vote', new: 'votes' },
    { old: 'Comment', new: 'comments' },
    { old: 'Tag', new: 'tags' },
  ];

  tablesToRename.forEach(({ old: oldName, new: newName }) => {
    try {
      // Vérifier si l'ancienne table existe
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(oldName);

      if (tableExists) {
        console.log(`   ✓ Renommage de "${oldName}" → "${newName}"`);
        db.prepare(`ALTER TABLE "${oldName}" RENAME TO "${newName}"`).run();
      }
    } catch (error) {
      // Ignorer les erreurs si la table n'existe pas ou est déjà renommée
      if (!error.message.includes('no such table')) {
        console.log(`   ⚠️  Avertissement pour ${oldName}: ${error.message}`);
      }
    }
  });

  // Créer la table non_user_members si elle n'existe pas
  console.log('\n📝 Vérification de la table non_user_members...');
  const nonUserMemberExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='non_user_members'"
  ).get();

  if (!nonUserMemberExists) {
    console.log('   Création de la table non_user_members...');
    db.exec(`
      CREATE TABLE "non_user_members" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "position" TEXT,
        "organizationId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "non_user_members_organizationId_idx" ON "non_user_members"("organizationId");
    `);
    console.log('   ✓ Table non_user_members créée');
  } else {
    console.log('   ✓ Table non_user_members existe déjà');
  }

  // Créer la table invitations si elle n'existe pas
  console.log('\n📝 Vérification de la table invitations...');
  const invitationsExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='invitations'"
  ).get();

  if (!invitationsExists) {
    console.log('   Création de la table invitations...');
    db.exec(`
      CREATE TABLE "invitations" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "position" TEXT,
        "role" TEXT NOT NULL DEFAULT 'MEMBER',
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "organizationId" TEXT NOT NULL,
        "invitedById" TEXT NOT NULL,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_key" ON "invitations"("token");
      CREATE INDEX IF NOT EXISTS "invitations_organizationId_idx" ON "invitations"("organizationId");
    `);
    console.log('   ✓ Table invitations créée');
  } else {
    console.log('   ✓ Table invitations existe déjà');
  }

  console.log('\n📋 Tables finales dans la base de données:');
  const finalTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  finalTables.forEach(table => {
    console.log(`   - ${table.name}`);
  });

  db.close();
  console.log('\n✅ Base de données corrigée avec succès!\n');
  console.log('👉 Redémarrez le serveur: npm run dev\n');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  console.error(error.stack);
  process.exit(1);
}
