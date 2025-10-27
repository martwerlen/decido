#!/usr/bin/env node

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

console.log('👤 Création d\'un utilisateur de test...\n');

async function createTestUser() {
  try {
    const dbPath = path.join(__dirname, '..', 'dev.db');
    const db = new Database(dbPath);

    // Vérifier si l'utilisateur existe déjà
    const existingUser = db.prepare('SELECT * FROM "User" WHERE email = ?').get('test@example.com');

    if (existingUser) {
      console.log('ℹ️  L\'utilisateur test@example.com existe déjà');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Mot de passe: password123\n');

      // Récupérer les organisations de l'utilisateur
      const orgs = db.prepare(`
        SELECT o.* FROM "Organization" o
        JOIN "OrganizationMember" om ON o.id = om.organizationId
        WHERE om.userId = ?
      `).all(existingUser.id);

      if (orgs.length > 0) {
        console.log('🏢 Organisations:');
        orgs.forEach(org => {
          console.log(`   - ${org.name} (ID: ${org.id})`);
          console.log(`     URL: http://localhost:3000/organizations/${org.id}/members`);
        });
      }

      db.close();
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Créer l'utilisateur
    const userId = 'cltest' + Date.now();
    db.prepare(`
      INSERT INTO "User" (id, email, name, password, emailVerified, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, NULL, datetime('now'), datetime('now'))
    `).run(userId, 'test@example.com', 'Utilisateur Test', hashedPassword);

    console.log('✅ Utilisateur créé avec succès!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Mot de passe: password123\n');

    // Créer une organisation de test
    const orgId = 'clorg' + Date.now();
    db.prepare(`
      INSERT INTO "Organization" (id, name, description, slug, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(orgId, 'Organisation Test', 'Organisation de test pour développement', 'org-test');

    // Ajouter l'utilisateur comme propriétaire de l'organisation
    const memberId = 'clmember' + Date.now();
    db.prepare(`
      INSERT INTO "OrganizationMember" (id, userId, organizationId, role, joinedAt)
      VALUES (?, ?, ?, 'OWNER', datetime('now'))
    `).run(memberId, userId, orgId);

    console.log('🏢 Organisation créée:');
    console.log('   - Organisation Test (ID: ' + orgId + ')');
    console.log('   - URL: http://localhost:3000/organizations/' + orgId + '/members\n');

    console.log('🎉 Tout est prêt! Vous pouvez maintenant vous connecter.\n');

    db.close();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createTestUser();
