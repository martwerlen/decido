-- Script SQL pour créer 12 décisions CONSENT de test (2 par stade)
-- Organisation: APM
-- Créateur: Martin WERLEN

-- IMPORTANT: Avant d'exécuter ce script, vérifiez et ajustez:
-- 1. L'ID de l'organisation APM (voir SELECT ci-dessous)
-- 2. L'ID de Martin WERLEN (voir SELECT ci-dessous)
-- 3. Les IDs des participants (voir SELECT ci-dessous)

-- Pour exécuter: npx prisma db execute --file scripts/seed-consent-decisions.sql --schema prisma/schema.prisma

-- 📋 Vérifications préalables (à exécuter manuellement pour obtenir les IDs):
-- SELECT id, name, slug FROM Organization WHERE name LIKE '%APM%';
-- SELECT id, name, email FROM User WHERE name LIKE '%Martin%' AND email LIKE '%werlen%';
-- SELECT u.id, u.name, u.email FROM User u
-- INNER JOIN OrganizationMember om ON om.userId = u.id
-- WHERE om.organizationId = 'ORG_ID_HERE' LIMIT 5;

-- ⚠️ REMPLACEZ CES VALEURS AVANT D'EXÉCUTER:
-- @ORG_ID = ID de l'organisation APM (ex: 'cm3f8...')
-- @CREATOR_ID = ID de Martin WERLEN (ex: 'cm3f8...')
-- @PARTICIPANT_1 = ID du participant 1
-- @PARTICIPANT_2 = ID du participant 2
-- @PARTICIPANT_3 = ID du participant 3

-- =============================================================================
-- 1. CLARIFICATIONS (mode DISTINCT) - 2 décisions
-- =============================================================================

-- Décision 1: Rénovation de la salle de réunion
INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Rénovation de la salle de réunion - Clarifications 1',
  'Décision de test au stade CLARIFICATIONS (mode DISTINCT)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Rénovation de la salle de réunion - Clarifications 1. Ceci est un texte de test pour simuler une proposition de décision par consentement.',
  'Proposition initiale pour Rénovation de la salle de réunion - Clarifications 1. Ceci est un texte de test pour simuler une proposition de décision par consentement.',
  'DISTINCT',
  'CLARIFICATIONS',
  NULL,
  datetime('now', '-1 day'),
  datetime('now', '+13 days'),
  NULL,
  datetime('now', '-1 day'),
  datetime('now')
);

-- Participants pour décision 1
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM Decision WHERE title = 'Rénovation de la salle de réunion - Clarifications 1'),
  '@PARTICIPANT_1', -- ⚠️ REMPLACER
  'MANUAL',
  0,
  datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM Decision WHERE title = 'Rénovation de la salle de réunion - Clarifications 1'),
  '@PARTICIPANT_2', -- ⚠️ REMPLACER
  'MANUAL',
  0,
  datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM Decision WHERE title = 'Rénovation de la salle de réunion - Clarifications 1'),
  '@PARTICIPANT_3', -- ⚠️ REMPLACER
  'MANUAL',
  0,
  datetime('now');

-- Questions de clarification pour décision 1
INSERT INTO ClarificationQuestion (id, decisionId, questionerId, questionText, answerText, answererId, answeredAt, createdAt, updatedAt)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM Decision WHERE title = 'Rénovation de la salle de réunion - Clarifications 1'),
  '@PARTICIPANT_1', -- ⚠️ REMPLACER
  'Pouvez-vous préciser le budget alloué à cette proposition ?',
  'Le budget prévu est de 5000€, financé par la ligne budgétaire "Projets innovants".',
  '@CREATOR_ID', -- ⚠️ REMPLACER
  datetime('now', '-12 hours'),
  datetime('now', '-1 day'),
  datetime('now', '-12 hours');

INSERT INTO ClarificationQuestion (id, decisionId, questionerId, questionText, answerText, answererId, answeredAt, createdAt, updatedAt)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM Decision WHERE title = 'Rénovation de la salle de réunion - Clarifications 1'),
  '@PARTICIPANT_2', -- ⚠️ REMPLACER
  'Quel est le calendrier prévu pour la mise en œuvre ?',
  NULL,
  NULL,
  NULL,
  datetime('now', '-1 day'),
  datetime('now', '-1 day');

-- Décision 2: Mise en place du télétravail
INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Mise en place du télétravail - Clarifications 2',
  'Décision de test au stade CLARIFICATIONS (mode DISTINCT)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Mise en place du télétravail - Clarifications 2. Ceci est un texte de test pour simuler une proposition de décision par consentement.',
  'Proposition initiale pour Mise en place du télétravail - Clarifications 2. Ceci est un texte de test pour simuler une proposition de décision par consentement.',
  'DISTINCT',
  'CLARIFICATIONS',
  NULL,
  datetime('now', '-2 days'),
  datetime('now', '+12 days'),
  NULL,
  datetime('now', '-2 days'),
  datetime('now')
);

-- Participants pour décision 2
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM Decision WHERE title = 'Mise en place du télétravail - Clarifications 2'),
  '@PARTICIPANT_1', -- ⚠️ REMPLACER
  'MANUAL',
  0,
  datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM Decision WHERE title = 'Mise en place du télétravail - Clarifications 2'),
  '@PARTICIPANT_2', -- ⚠️ REMPLACER
  'MANUAL',
  0,
  datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM Decision WHERE title = 'Mise en place du télétravail - Clarifications 2'),
  '@PARTICIPANT_3', -- ⚠️ REMPLACER
  'MANUAL',
  0,
  datetime('now');

-- =============================================================================
-- 2. CLARIFAVIS (mode MERGED) - 2 décisions
-- =============================================================================

INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Nouvelle politique de congés - Clarifavis 1',
  'Décision de test au stade CLARIFAVIS (mode MERGED)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Nouvelle politique de congés - Clarifavis 1. Ceci est un texte de test.',
  'Proposition initiale pour Nouvelle politique de congés - Clarifavis 1. Ceci est un texte de test.',
  'MERGED',
  'CLARIFAVIS',
  NULL,
  datetime('now', '-3 days'),
  datetime('now', '+11 days'),
  NULL,
  datetime('now', '-3 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouvelle politique de congés - Clarifavis 1'), '@PARTICIPANT_1', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouvelle politique de congés - Clarifavis 1'), '@PARTICIPANT_2', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouvelle politique de congés - Clarifavis 1'), '@PARTICIPANT_3', 'MANUAL', 0, datetime('now');

-- Question + Avis
INSERT INTO ClarificationQuestion (id, decisionId, questionerId, questionText, answerText, answererId, answeredAt, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouvelle politique de congés - Clarifavis 1'), '@PARTICIPANT_1', 'Combien de jours de congés supplémentaires ?', 'Nous proposons 5 jours supplémentaires.', '@CREATOR_ID', datetime('now', '-1 day'), datetime('now', '-3 days'), datetime('now', '-1 day');

INSERT INTO OpinionResponse (id, decisionId, userId, content, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouvelle politique de congés - Clarifavis 1'), '@PARTICIPANT_1', 'Je trouve cette proposition très pertinente. Elle répond à un vrai besoin.', datetime('now', '-2 days'), datetime('now', '-2 days');

-- Décision CLARIFAVIS 2
INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Budget formation 2025 - Clarifavis 2',
  'Décision de test au stade CLARIFAVIS (mode MERGED)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Budget formation 2025 - Clarifavis 2.',
  'Proposition initiale pour Budget formation 2025 - Clarifavis 2.',
  'MERGED',
  'CLARIFAVIS',
  NULL,
  datetime('now', '-4 days'),
  datetime('now', '+10 days'),
  NULL,
  datetime('now', '-4 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Budget formation 2025 - Clarifavis 2'), '@PARTICIPANT_1', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Budget formation 2025 - Clarifavis 2'), '@PARTICIPANT_2', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Budget formation 2025 - Clarifavis 2'), '@PARTICIPANT_3', 'MANUAL', 0, datetime('now');

-- =============================================================================
-- 3. AVIS (mode DISTINCT) - 2 décisions
-- =============================================================================

INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Choix du nouveau logiciel CRM - Avis 1',
  'Décision de test au stade AVIS (mode DISTINCT)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Choix du nouveau logiciel CRM - Avis 1.',
  'Proposition initiale pour Choix du nouveau logiciel CRM - Avis 1.',
  'DISTINCT',
  'AVIS',
  NULL,
  datetime('now', '-6 days'),
  datetime('now', '+8 days'),
  NULL,
  datetime('now', '-6 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Choix du nouveau logiciel CRM - Avis 1'), '@PARTICIPANT_1', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Choix du nouveau logiciel CRM - Avis 1'), '@PARTICIPANT_2', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Choix du nouveau logiciel CRM - Avis 1'), '@PARTICIPANT_3', 'MANUAL', 0, datetime('now');

-- AVIS 2
INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Réorganisation des équipes - Avis 2',
  'Décision de test au stade AVIS (mode DISTINCT)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Réorganisation des équipes - Avis 2.',
  'Proposition initiale pour Réorganisation des équipes - Avis 2.',
  'DISTINCT',
  'AVIS',
  NULL,
  datetime('now', '-7 days'),
  datetime('now', '+7 days'),
  NULL,
  datetime('now', '-7 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Réorganisation des équipes - Avis 2'), '@PARTICIPANT_1', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Réorganisation des équipes - Avis 2'), '@PARTICIPANT_2', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Réorganisation des équipes - Avis 2'), '@PARTICIPANT_3', 'MANUAL', 0, datetime('now');

-- =============================================================================
-- 4. AMENDEMENTS - 2 décisions
-- =============================================================================

INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Règlement intérieur modifié - Amendements 1',
  'Décision de test au stade AMENDEMENTS (mode DISTINCT)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Règlement intérieur modifié - Amendements 1.',
  'Proposition initiale pour Règlement intérieur modifié - Amendements 1.',
  'DISTINCT',
  'AMENDEMENTS',
  NULL,
  datetime('now', '-9 days'),
  datetime('now', '+5 days'),
  NULL,
  datetime('now', '-9 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Règlement intérieur modifié - Amendements 1'), '@PARTICIPANT_1', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Règlement intérieur modifié - Amendements 1'), '@PARTICIPANT_2', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Règlement intérieur modifié - Amendements 1'), '@PARTICIPANT_3', 'MANUAL', 0, datetime('now');

-- AMENDEMENTS 2
INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Charte environnementale - Amendements 2',
  'Décision de test au stade AMENDEMENTS (mode MERGED)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Charte environnementale - Amendements 2.',
  'Proposition initiale pour Charte environnementale - Amendements 2.',
  'MERGED',
  'AMENDEMENTS',
  NULL,
  datetime('now', '-10 days'),
  datetime('now', '+4 days'),
  NULL,
  datetime('now', '-10 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Charte environnementale - Amendements 2'), '@PARTICIPANT_1', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Charte environnementale - Amendements 2'), '@PARTICIPANT_2', 'MANUAL', 0, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Charte environnementale - Amendements 2'), '@PARTICIPANT_3', 'MANUAL', 0, datetime('now');

-- =============================================================================
-- 5. OBJECTIONS - 2 décisions
-- =============================================================================

INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Nouveau système de paie - Objections 1',
  'Décision de test au stade OBJECTIONS (mode DISTINCT)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Nouveau système de paie - Objections 1.',
  'Proposition amendée pour Nouveau système de paie - Objections 1. Le créateur a modifié la proposition.',
  'DISTINCT',
  'OBJECTIONS',
  'AMENDED',
  datetime('now', '-12 days'),
  datetime('now', '+2 days'),
  NULL,
  datetime('now', '-12 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouveau système de paie - Objections 1'), '@PARTICIPANT_1', 'MANUAL', 1, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouveau système de paie - Objections 1'), '@PARTICIPANT_2', 'MANUAL', 1, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouveau système de paie - Objections 1'), '@PARTICIPANT_3', 'MANUAL', 1, datetime('now');

-- Objections
INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouveau système de paie - Objections 1'), '@PARTICIPANT_1', 'NO_OBJECTION', NULL, datetime('now', '-1 day'), datetime('now', '-1 day');

INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouveau système de paie - Objections 1'), '@PARTICIPANT_2', 'NO_OBJECTION', NULL, datetime('now', '-1 day'), datetime('now', '-1 day');

INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Nouveau système de paie - Objections 1'), '@PARTICIPANT_3', 'NO_OBJECTION', NULL, datetime('now', '-1 day'), datetime('now', '-1 day');

-- OBJECTIONS 2
INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Politique de mobilité douce - Objections 2',
  'Décision de test au stade OBJECTIONS (mode MERGED)',
  'CONSENT',
  'OPEN',
  NULL,
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Politique de mobilité douce - Objections 2.',
  'Proposition amendée pour Politique de mobilité douce - Objections 2.',
  'MERGED',
  'OBJECTIONS',
  'AMENDED',
  datetime('now', '-13 days'),
  datetime('now', '+1 day'),
  NULL,
  datetime('now', '-13 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Politique de mobilité douce - Objections 2'), '@PARTICIPANT_1', 'MANUAL', 1, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Politique de mobilité douce - Objections 2'), '@PARTICIPANT_2', 'MANUAL', 1, datetime('now');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Politique de mobilité douce - Objections 2'), '@PARTICIPANT_3', 'MANUAL', 1, datetime('now');

-- Objections
INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Politique de mobilité douce - Objections 2'), '@PARTICIPANT_1', 'NO_OBJECTION', NULL, datetime('now', '-1 day'), datetime('now', '-1 day');

INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Politique de mobilité douce - Objections 2'), '@PARTICIPANT_2', 'NO_OBJECTION', NULL, datetime('now', '-1 day'), datetime('now', '-1 day');

INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Politique de mobilité douce - Objections 2'), '@PARTICIPANT_3', 'NO_OBJECTION', NULL, datetime('now', '-1 day'), datetime('now', '-1 day');

-- =============================================================================
-- 6. TERMINEE - 2 décisions
-- =============================================================================

INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Achat de matériel informatique - Terminée 1',
  'Décision de test au stade TERMINEE (mode DISTINCT)',
  'CONSENT',
  'CLOSED',
  'APPROVED',
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Achat de matériel informatique - Terminée 1.',
  'Proposition amendée pour Achat de matériel informatique - Terminée 1.',
  'DISTINCT',
  'TERMINEE',
  'AMENDED',
  datetime('now', '-21 days'),
  datetime('now', '-7 days'),
  datetime('now', '-7 days'),
  datetime('now', '-21 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Achat de matériel informatique - Terminée 1'), '@PARTICIPANT_1', 'MANUAL', 1, datetime('now', '-21 days');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Achat de matériel informatique - Terminée 1'), '@PARTICIPANT_2', 'MANUAL', 1, datetime('now', '-21 days');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Achat de matériel informatique - Terminée 1'), '@PARTICIPANT_3', 'MANUAL', 1, datetime('now', '-21 days');

-- Objections
INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Achat de matériel informatique - Terminée 1'), '@PARTICIPANT_1', 'NO_OBJECTION', NULL, datetime('now', '-8 days'), datetime('now', '-8 days');

INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Achat de matériel informatique - Terminée 1'), '@PARTICIPANT_2', 'NO_OBJECTION', NULL, datetime('now', '-8 days'), datetime('now', '-8 days');

INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Achat de matériel informatique - Terminée 1'), '@PARTICIPANT_3', 'NO_OBJECTION', NULL, datetime('now', '-8 days'), datetime('now', '-8 days');

-- TERMINEE 2
INSERT INTO Decision (
  id, title, description, decisionType, status, result, votingMode,
  organizationId, creatorId, initialProposal, proposal,
  consentStepMode, consentCurrentStage, consentAmendmentAction,
  startDate, endDate, decidedAt, createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'Partenariat avec association locale - Terminée 2',
  'Décision de test au stade TERMINEE (mode MERGED)',
  'CONSENT',
  'CLOSED',
  'APPROVED',
  'INVITED',
  '@ORG_ID', -- ⚠️ REMPLACER
  '@CREATOR_ID', -- ⚠️ REMPLACER
  'Proposition initiale pour Partenariat avec association locale - Terminée 2.',
  'Proposition amendée pour Partenariat avec association locale - Terminée 2.',
  'MERGED',
  'TERMINEE',
  'AMENDED',
  datetime('now', '-28 days'),
  datetime('now', '-14 days'),
  datetime('now', '-14 days'),
  datetime('now', '-28 days'),
  datetime('now')
);

-- Participants
INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Partenariat avec association locale - Terminée 2'), '@PARTICIPANT_1', 'MANUAL', 1, datetime('now', '-28 days');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Partenariat avec association locale - Terminée 2'), '@PARTICIPANT_2', 'MANUAL', 1, datetime('now', '-28 days');

INSERT INTO DecisionParticipant (id, decisionId, userId, invitedVia, hasVoted, createdAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Partenariat avec association locale - Terminée 2'), '@PARTICIPANT_3', 'MANUAL', 1, datetime('now', '-28 days');

-- Objections
INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Partenariat avec association locale - Terminée 2'), '@PARTICIPANT_1', 'NO_OBJECTION', NULL, datetime('now', '-15 days'), datetime('now', '-15 days');

INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Partenariat avec association locale - Terminée 2'), '@PARTICIPANT_2', 'NO_OBJECTION', NULL, datetime('now', '-15 days'), datetime('now', '-15 days');

INSERT INTO ConsentObjection (id, decisionId, userId, status, objectionText, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM Decision WHERE title = 'Partenariat avec association locale - Terminée 2'), '@PARTICIPANT_3', 'NO_OBJECTION', NULL, datetime('now', '-15 days'), datetime('now', '-15 days');

-- =============================================================================
-- ✅ FIN DU SCRIPT
-- =============================================================================
-- 12 décisions CONSENT créées (2 par stade)
