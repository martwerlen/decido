/**
 * Script pour créer des décisions CONSENT de test avec better-sqlite3
 * Usage: node scripts/seed-consent-decisions-sqlite.js
 *
 * Ce script utilise better-sqlite3 pour insérer directement dans la base SQLite,
 * sans nécessiter la génération du client Prisma.
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const db = new Database(dbPath);

// Fonction pour générer un CUID-like
function cuid() {
  return 'c' + Date.now().toString(36) + crypto.randomBytes(8).toString('hex');
}

// Fonction pour générer un ID compatible SQLite
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

async function main() {
  console.log('🌱 Début du seeding des décisions CONSENT...\n');

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

  // 2. Trouver Martin WERLEN
  const creator = db.prepare(`
    SELECT * FROM users
    WHERE (name LIKE '%Martin%' AND email LIKE '%werlen%')
       OR email LIKE '%martin@%'
    LIMIT 1
  `).get();

  if (!creator) {
    console.error('❌ Martin WERLEN non trouvé');
    process.exit(1);
  }
  console.log(`✅ Créateur trouvé: ${creator.name} (${creator.email})`);

  // 3. Trouver les membres de l'organisation
  const members = db.prepare(`
    SELECT om.*, u.*
    FROM organization_members om
    JOIN users u ON om.userId = u.id
    WHERE om.organizationId = ?
    LIMIT 5
  `).all(org.id);

  if (members.length < 3) {
    console.error('❌ Pas assez de membres trouvés (minimum 3 requis)');
    process.exit(1);
  }
  console.log(`✅ ${members.length} membres trouvés\n`);

  const participantIds = members.slice(0, 3).map(m => m.userId);

  const now = new Date();

  // Fonction helper pour créer une décision
  function createDecision(config) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - config.daysAgo);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + config.durationDays);

    const decidedAt = config.stage === 'TERMINEE' ? endDate : null;

    console.log(`📝 Création: ${config.title}...`);

    try {
      const decisionId = cuid();

      // Créer la décision
      db.prepare(`
        INSERT INTO decisions (
          id, title, description, decisionType, status, result, votingMode,
          organizationId, creatorId, initialProposal, proposal,
          consentStepMode, consentCurrentStage, consentAmendmentAction,
          startDate, endDate, decidedAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        decisionId,
        config.title,
        `Décision de test au stade ${config.stage} (mode ${config.mode === 'MERGED' ? 'CLARIFAVIS' : 'DISTINCT'})`,
        'CONSENT',
        config.stage === 'TERMINEE' ? 'CLOSED' : 'OPEN',
        config.stage === 'TERMINEE' ? 'APPROVED' : null,
        'INVITED',
        org.id,
        creator.id,
        `Proposition initiale pour ${config.title}. Ceci est un texte de test pour simuler une proposition de décision par consentement.`,
        config.amendProposal
          ? `Proposition amendée pour ${config.title}. Le créateur a modifié la proposition suite aux retours.`
          : `Proposition initiale pour ${config.title}. Ceci est un texte de test pour simuler une proposition de décision par consentement.`,
        config.mode,
        config.stage,
        config.amendmentAction || null,
        startDate.toISOString(),
        endDate.toISOString(),
        decidedAt ? decidedAt.toISOString() : null,
        startDate.toISOString(),
        startDate.toISOString()
      );

      // Ajouter les participants
      for (const userId of participantIds) {
        const participantId = cuid();
        db.prepare(`
          INSERT INTO decision_participants (
            id, decisionId, userId, invitedVia, hasVoted, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          participantId,
          decisionId,
          userId,
          'MANUAL',
          config.hasVoted ? 1 : 0,
          startDate.toISOString()
        );
      }

      // Ajouter des questions de clarification
      if (config.addQuestions) {
        const q1Id = cuid();
        const answeredAt = new Date(startDate.getTime() + 12 * 60 * 60 * 1000);

        db.prepare(`
          INSERT INTO clarification_questions (
            id, decisionId, questionerId, questionText, answerText, answererId, answeredAt, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          q1Id,
          decisionId,
          participantIds[0],
          'Pouvez-vous préciser le budget alloué à cette proposition ?',
          'Le budget prévu est de 5000€, financé par la ligne budgétaire "Projets innovants".',
          creator.id,
          answeredAt.toISOString(),
          startDate.toISOString(),
          answeredAt.toISOString()
        );

        const q2Id = cuid();
        db.prepare(`
          INSERT INTO clarification_questions (
            id, decisionId, questionerId, questionText, answerText, answererId, answeredAt, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          q2Id,
          decisionId,
          participantIds[1],
          'Quel est le calendrier prévu pour la mise en œuvre ?',
          null,
          null,
          null,
          startDate.toISOString(),
          startDate.toISOString()
        );
      }

      // Ajouter un avis pour CLARIFAVIS
      if (config.addOpinion) {
        const opinionId = cuid();
        db.prepare(`
          INSERT INTO opinion_responses (
            id, decisionId, userId, content, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          opinionId,
          decisionId,
          participantIds[0],
          'Je trouve cette proposition très pertinente. Elle répond à un vrai besoin de notre organisation.',
          startDate.toISOString(),
          startDate.toISOString()
        );
      }

      // Ajouter des objections
      if (config.addObjections) {
        for (const userId of participantIds) {
          const objectionId = cuid();
          db.prepare(`
            INSERT INTO consent_objections (
              id, decisionId, userId, status, objectionText, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            objectionId,
            decisionId,
            userId,
            'NO_OBJECTION',
            null,
            startDate.toISOString(),
            startDate.toISOString()
          );
        }
      }

      console.log(`   ✅ Créée avec succès`);
      return decisionId;

    } catch (error) {
      console.error(`   ❌ Erreur:`, error.message);
      return null;
    }
  }

  // Utiliser une transaction pour toutes les insertions
  const insert = db.transaction(() => {
    // CLARIFICATIONS (mode DISTINCT) - 2 décisions
    createDecision({
      title: 'Rénovation de la salle de réunion - Clarifications 1',
      stage: 'CLARIFICATIONS',
      mode: 'DISTINCT',
      daysAgo: 1,
      durationDays: 14,
      addQuestions: true,
    });

    createDecision({
      title: 'Mise en place du télétravail - Clarifications 2',
      stage: 'CLARIFICATIONS',
      mode: 'DISTINCT',
      daysAgo: 2,
      durationDays: 14,
      addQuestions: true,
    });

    // CLARIFAVIS (mode MERGED) - 2 décisions
    createDecision({
      title: 'Nouvelle politique de congés - Clarifavis 1',
      stage: 'CLARIFAVIS',
      mode: 'MERGED',
      daysAgo: 3,
      durationDays: 14,
      addQuestions: true,
      addOpinion: true,
    });

    createDecision({
      title: 'Budget formation 2025 - Clarifavis 2',
      stage: 'CLARIFAVIS',
      mode: 'MERGED',
      daysAgo: 4,
      durationDays: 14,
      addQuestions: true,
    });

    // AVIS (mode DISTINCT) - 2 décisions
    createDecision({
      title: 'Choix du nouveau logiciel CRM - Avis 1',
      stage: 'AVIS',
      mode: 'DISTINCT',
      daysAgo: 6,
      durationDays: 14,
      addQuestions: true,
    });

    createDecision({
      title: 'Réorganisation des équipes - Avis 2',
      stage: 'AVIS',
      mode: 'DISTINCT',
      daysAgo: 7,
      durationDays: 14,
      addQuestions: true,
    });

    // AMENDEMENTS - 2 décisions
    createDecision({
      title: 'Règlement intérieur modifié - Amendements 1',
      stage: 'AMENDEMENTS',
      mode: 'DISTINCT',
      daysAgo: 9,
      durationDays: 14,
      addQuestions: true,
    });

    createDecision({
      title: 'Charte environnementale - Amendements 2',
      stage: 'AMENDEMENTS',
      mode: 'MERGED',
      daysAgo: 10,
      durationDays: 14,
      addQuestions: true,
    });

    // OBJECTIONS - 2 décisions
    createDecision({
      title: 'Nouveau système de paie - Objections 1',
      stage: 'OBJECTIONS',
      mode: 'DISTINCT',
      daysAgo: 12,
      durationDays: 14,
      amendProposal: true,
      amendmentAction: 'AMENDED',
      hasVoted: true,
      addObjections: true,
    });

    createDecision({
      title: 'Politique de mobilité douce - Objections 2',
      stage: 'OBJECTIONS',
      mode: 'MERGED',
      daysAgo: 13,
      durationDays: 14,
      amendProposal: true,
      amendmentAction: 'AMENDED',
      hasVoted: true,
      addObjections: true,
    });

    // TERMINEE - 2 décisions
    createDecision({
      title: 'Achat de matériel informatique - Terminée 1',
      stage: 'TERMINEE',
      mode: 'DISTINCT',
      daysAgo: 21,
      durationDays: 14,
      amendProposal: true,
      amendmentAction: 'AMENDED',
      hasVoted: true,
      addObjections: true,
    });

    createDecision({
      title: 'Partenariat avec association locale - Terminée 2',
      stage: 'TERMINEE',
      mode: 'MERGED',
      daysAgo: 28,
      durationDays: 14,
      amendProposal: true,
      amendmentAction: 'AMENDED',
      hasVoted: true,
      addObjections: true,
    });
  });

  insert();

  console.log('\n✅ Seeding terminé avec succès !');
  console.log('📊 12 décisions CONSENT créées (2 par stade)');

  db.close();
}

main().catch((e) => {
  console.error('❌ Erreur globale:', e);
  db.close();
  process.exit(1);
});
