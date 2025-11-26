-- Migration de données de test pour l'organisation "Test" sur Railway
--
-- INSTRUCTIONS:
-- 1. Connectez-vous à votre base PostgreSQL sur Railway
-- 2. Récupérez l'ID de l'organisation "Test" et l'ID du créateur:
--    SELECT id FROM "Organization" WHERE slug = 'Test';
--    SELECT id FROM "User" WHERE email = 'votre-email@example.com';
-- 3. Remplacez {ORG_ID} et {CREATOR_ID} ci-dessous par les valeurs réelles
-- 4. Exécutez ce script avec: psql <connection-string> -f test-data-migration.sql
--
-- Ce script crée:
-- - 5 décisions terminées (APPROVED) de types différents
-- - 15 participants externes par décision (75 au total, réutilisés)
-- - Les votes/opinions correspondants pour chaque type de décision

-- Variables à remplacer:
-- {ORG_ID} = ID de l'organisation "Test"
-- {CREATOR_ID} = ID de l'utilisateur créateur (vous)

-- ============================================================================
-- ÉTAPE 1: Créer les 5 décisions
-- ============================================================================

-- 1.1 MAJORITY - Choix du nouveau logo
INSERT INTO "Decision" (
  "id", "title", "description", "context", "proposal", "initialProposal",
  "decisionType", "status", "result", "votingMode",
  "startDate", "endDate", "decidedAt",
  "organizationId", "creatorId",
  "createdAt", "updatedAt"
) VALUES (
  'decision_majority_001',
  'Choix du nouveau logo de l''entreprise',
  'Suite à notre rebranding, nous devons choisir le nouveau logo parmi 3 propositions.',
  'Le comité de direction a sélectionné 3 designs finalistes.',
  NULL, NULL,
  'MAJORITY', 'CLOSED', 'APPROVED', 'INVITED',
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
  '{ORG_ID}', '{CREATOR_ID}',
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'
);

-- 1.2 NUANCED_VOTE - Évaluation des propositions de formations
INSERT INTO "Decision" (
  "id", "title", "description", "context", "proposal", "initialProposal",
  "decisionType", "status", "result", "votingMode",
  "nuancedScale",
  "startDate", "endDate", "decidedAt",
  "organizationId", "creatorId",
  "createdAt", "updatedAt"
) VALUES (
  'decision_nuanced_001',
  'Évaluation des formations pour 2025',
  'Évaluation de 4 programmes de formation proposés pour l''année prochaine.',
  'Budget disponible: 50 000€. Nous pouvons financer les 2 formations les mieux notées.',
  NULL, NULL,
  'NUANCED_VOTE', 'CLOSED', 'APPROVED', 'INVITED',
  '5_LEVELS',
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
  '{ORG_ID}', '{CREATOR_ID}',
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'
);

-- 1.3 CONSENSUS - Adoption du télétravail
INSERT INTO "Decision" (
  "id", "title", "description", "context", "proposal", "initialProposal",
  "decisionType", "status", "result", "votingMode",
  "startDate", "endDate", "decidedAt",
  "organizationId", "creatorId",
  "createdAt", "updatedAt"
) VALUES (
  'decision_consensus_001',
  'Adoption d''une politique de télétravail flexible',
  'Proposition de permettre à tous les employés de télétravailler jusqu''à 3 jours par semaine.',
  'Cette mesure vise à améliorer la qualité de vie au travail et l''attractivité de l''entreprise.',
  'Permettre à tous les employés de télétravailler jusqu''à 3 jours par semaine, avec obligation de présence les mardis et jeudis pour maintenir la cohésion d''équipe.',
  'Permettre à tous les employés de télétravailler jusqu''à 3 jours par semaine, avec obligation de présence les mardis et jeudis pour maintenir la cohésion d''équipe.',
  'CONSENSUS', 'CLOSED', 'APPROVED', 'INVITED',
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
  '{ORG_ID}', '{CREATOR_ID}',
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'
);

-- 1.4 CONSENT - Réorganisation des équipes
INSERT INTO "Decision" (
  "id", "title", "description", "context", "proposal", "initialProposal",
  "decisionType", "status", "result", "votingMode",
  "consentStepMode", "consentCurrentStage", "consentAmendmentAction",
  "startDate", "endDate", "decidedAt",
  "organizationId", "creatorId",
  "createdAt", "updatedAt"
) VALUES (
  'decision_consent_001',
  'Réorganisation des équipes projet',
  'Proposition de restructurer les équipes en 3 pôles thématiques au lieu de 5 équipes fonctionnelles.',
  'Objectif: améliorer la transversalité et réduire les silos.',
  'Restructurer en 3 pôles: Développement produit, Relation client, et Support & Infrastructure.',
  'Restructurer en 3 pôles: Développement produit, Relation client, et Support & Infrastructure.',
  'CONSENT', 'CLOSED', 'APPROVED', 'INVITED',
  'MERGED', 'TERMINEE', 'KEPT',
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
  '{ORG_ID}', '{CREATOR_ID}',
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'
);

-- 1.5 ADVICE_SOLICITATION - Investissement dans un nouvel outil
INSERT INTO "Decision" (
  "id", "title", "description", "context", "proposal", "initialProposal",
  "decisionType", "status", "result", "votingMode",
  "conclusion",
  "startDate", "decidedAt",
  "organizationId", "creatorId",
  "createdAt", "updatedAt"
) VALUES (
  'decision_advice_001',
  'Investissement dans un outil de gestion de projet',
  'Intention d''investir 15 000€/an dans un outil de gestion de projet pour remplacer nos outils actuels.',
  'Nos outils actuels sont fragmentés (Trello, Asana, Excel) et causent des pertes d''information.',
  'Investir dans Jira + Confluence avec formation de l''équipe sur 3 mois.',
  'Investir dans Jira + Confluence avec formation de l''équipe sur 3 mois.',
  'ADVICE_SOLICITATION', 'CLOSED', 'APPROVED', 'INVITED',
  'Après consultation, nous procédons à l''achat de Jira + Confluence. Formation prévue en janvier 2025. Merci pour vos retours constructifs !',
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day',
  '{ORG_ID}', '{CREATOR_ID}',
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
);

-- ============================================================================
-- ÉTAPE 2: Créer les propositions (pour MAJORITY et NUANCED_VOTE)
-- ============================================================================

-- Propositions pour MAJORITY (Choix du logo)
INSERT INTO "Proposal" ("id", "title", "description", "order", "decisionId", "createdAt", "updatedAt") VALUES
  ('proposal_maj_1', 'Logo Moderne', 'Design minimaliste avec typo sans-serif', 0, 'decision_majority_001', NOW(), NOW()),
  ('proposal_maj_2', 'Logo Classique', 'Design élégant avec empattements', 1, 'decision_majority_001', NOW(), NOW()),
  ('proposal_maj_3', 'Logo Créatif', 'Design original avec illustration', 2, 'decision_majority_001', NOW(), NOW());

-- Propositions pour NUANCED_VOTE (Formations)
INSERT INTO "NuancedProposal" ("id", "title", "description", "order", "decisionId", "createdAt", "updatedAt") VALUES
  ('proposal_nua_1', 'Formation Leadership', 'Programme de développement des compétences managériales (3 jours)', 0, 'decision_nuanced_001', NOW(), NOW()),
  ('proposal_nua_2', 'Formation Tech Avancée', 'Kubernetes et microservices (5 jours)', 1, 'decision_nuanced_001', NOW(), NOW()),
  ('proposal_nua_3', 'Formation Communication', 'Communication non-violente et gestion des conflits (2 jours)', 2, 'decision_nuanced_001', NOW(), NOW()),
  ('proposal_nua_4', 'Formation Agilité', 'Scrum Master certification (4 jours)', 3, 'decision_nuanced_001', NOW(), NOW());

-- ============================================================================
-- ÉTAPE 3: Créer les 15 participants externes et les lier aux décisions
-- ============================================================================

-- Participants pour MAJORITY
INSERT INTO "DecisionParticipant" ("id", "decisionId", "externalEmail", "externalName", "invitedVia", "hasVoted", "createdAt", "updatedAt") VALUES
  ('part_maj_01', 'decision_majority_001', 'externe01@example.com', 'Marie Dupont', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_02', 'decision_majority_001', 'externe02@example.com', 'Jean Martin', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_03', 'decision_majority_001', 'externe03@example.com', 'Sophie Bernard', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_04', 'decision_majority_001', 'externe04@example.com', 'Luc Dubois', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_05', 'decision_majority_001', 'externe05@example.com', 'Emma Rousseau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_06', 'decision_majority_001', 'externe06@example.com', 'Paul Moreau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_07', 'decision_majority_001', 'externe07@example.com', 'Julie Laurent', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_08', 'decision_majority_001', 'externe08@example.com', 'Marc Simon', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_09', 'decision_majority_001', 'externe09@example.com', 'Claire Michel', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_10', 'decision_majority_001', 'externe10@example.com', 'Pierre Leroy', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_11', 'decision_majority_001', 'externe11@example.com', 'Camille Garnier', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_12', 'decision_majority_001', 'externe12@example.com', 'Thomas Faure', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_13', 'decision_majority_001', 'externe13@example.com', 'Sarah Durand', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_14', 'decision_majority_001', 'externe14@example.com', 'Alexandre Blanc', 'EXTERNAL', true, NOW(), NOW()),
  ('part_maj_15', 'decision_majority_001', 'externe15@example.com', 'Laura Girard', 'EXTERNAL', true, NOW(), NOW());

-- Participants pour NUANCED_VOTE (mêmes emails, nouveaux IDs)
INSERT INTO "DecisionParticipant" ("id", "decisionId", "externalEmail", "externalName", "invitedVia", "hasVoted", "createdAt", "updatedAt") VALUES
  ('part_nua_01', 'decision_nuanced_001', 'externe01@example.com', 'Marie Dupont', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_02', 'decision_nuanced_001', 'externe02@example.com', 'Jean Martin', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_03', 'decision_nuanced_001', 'externe03@example.com', 'Sophie Bernard', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_04', 'decision_nuanced_001', 'externe04@example.com', 'Luc Dubois', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_05', 'decision_nuanced_001', 'externe05@example.com', 'Emma Rousseau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_06', 'decision_nuanced_001', 'externe06@example.com', 'Paul Moreau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_07', 'decision_nuanced_001', 'externe07@example.com', 'Julie Laurent', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_08', 'decision_nuanced_001', 'externe08@example.com', 'Marc Simon', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_09', 'decision_nuanced_001', 'externe09@example.com', 'Claire Michel', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_10', 'decision_nuanced_001', 'externe10@example.com', 'Pierre Leroy', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_11', 'decision_nuanced_001', 'externe11@example.com', 'Camille Garnier', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_12', 'decision_nuanced_001', 'externe12@example.com', 'Thomas Faure', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_13', 'decision_nuanced_001', 'externe13@example.com', 'Sarah Durand', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_14', 'decision_nuanced_001', 'externe14@example.com', 'Alexandre Blanc', 'EXTERNAL', true, NOW(), NOW()),
  ('part_nua_15', 'decision_nuanced_001', 'externe15@example.com', 'Laura Girard', 'EXTERNAL', true, NOW(), NOW());

-- Participants pour CONSENSUS
INSERT INTO "DecisionParticipant" ("id", "decisionId", "externalEmail", "externalName", "invitedVia", "hasVoted", "createdAt", "updatedAt") VALUES
  ('part_con_01', 'decision_consensus_001', 'externe01@example.com', 'Marie Dupont', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_02', 'decision_consensus_001', 'externe02@example.com', 'Jean Martin', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_03', 'decision_consensus_001', 'externe03@example.com', 'Sophie Bernard', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_04', 'decision_consensus_001', 'externe04@example.com', 'Luc Dubois', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_05', 'decision_consensus_001', 'externe05@example.com', 'Emma Rousseau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_06', 'decision_consensus_001', 'externe06@example.com', 'Paul Moreau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_07', 'decision_consensus_001', 'externe07@example.com', 'Julie Laurent', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_08', 'decision_consensus_001', 'externe08@example.com', 'Marc Simon', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_09', 'decision_consensus_001', 'externe09@example.com', 'Claire Michel', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_10', 'decision_consensus_001', 'externe10@example.com', 'Pierre Leroy', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_11', 'decision_consensus_001', 'externe11@example.com', 'Camille Garnier', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_12', 'decision_consensus_001', 'externe12@example.com', 'Thomas Faure', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_13', 'decision_consensus_001', 'externe13@example.com', 'Sarah Durand', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_14', 'decision_consensus_001', 'externe14@example.com', 'Alexandre Blanc', 'EXTERNAL', true, NOW(), NOW()),
  ('part_con_15', 'decision_consensus_001', 'externe15@example.com', 'Laura Girard', 'EXTERNAL', true, NOW(), NOW());

-- Participants pour CONSENT
INSERT INTO "DecisionParticipant" ("id", "decisionId", "externalEmail", "externalName", "invitedVia", "hasVoted", "createdAt", "updatedAt") VALUES
  ('part_cns_01', 'decision_consent_001', 'externe01@example.com', 'Marie Dupont', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_02', 'decision_consent_001', 'externe02@example.com', 'Jean Martin', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_03', 'decision_consent_001', 'externe03@example.com', 'Sophie Bernard', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_04', 'decision_consent_001', 'externe04@example.com', 'Luc Dubois', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_05', 'decision_consent_001', 'externe05@example.com', 'Emma Rousseau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_06', 'decision_consent_001', 'externe06@example.com', 'Paul Moreau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_07', 'decision_consent_001', 'externe07@example.com', 'Julie Laurent', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_08', 'decision_consent_001', 'externe08@example.com', 'Marc Simon', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_09', 'decision_consent_001', 'externe09@example.com', 'Claire Michel', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_10', 'decision_consent_001', 'externe10@example.com', 'Pierre Leroy', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_11', 'decision_consent_001', 'externe11@example.com', 'Camille Garnier', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_12', 'decision_consent_001', 'externe12@example.com', 'Thomas Faure', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_13', 'decision_consent_001', 'externe13@example.com', 'Sarah Durand', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_14', 'decision_consent_001', 'externe14@example.com', 'Alexandre Blanc', 'EXTERNAL', true, NOW(), NOW()),
  ('part_cns_15', 'decision_consent_001', 'externe15@example.com', 'Laura Girard', 'EXTERNAL', true, NOW(), NOW());

-- Participants pour ADVICE_SOLICITATION
INSERT INTO "DecisionParticipant" ("id", "decisionId", "externalEmail", "externalName", "invitedVia", "hasVoted", "createdAt", "updatedAt") VALUES
  ('part_adv_01', 'decision_advice_001', 'externe01@example.com', 'Marie Dupont', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_02', 'decision_advice_001', 'externe02@example.com', 'Jean Martin', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_03', 'decision_advice_001', 'externe03@example.com', 'Sophie Bernard', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_04', 'decision_advice_001', 'externe04@example.com', 'Luc Dubois', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_05', 'decision_advice_001', 'externe05@example.com', 'Emma Rousseau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_06', 'decision_advice_001', 'externe06@example.com', 'Paul Moreau', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_07', 'decision_advice_001', 'externe07@example.com', 'Julie Laurent', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_08', 'decision_advice_001', 'externe08@example.com', 'Marc Simon', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_09', 'decision_advice_001', 'externe09@example.com', 'Claire Michel', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_10', 'decision_advice_001', 'externe10@example.com', 'Pierre Leroy', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_11', 'decision_advice_001', 'externe11@example.com', 'Camille Garnier', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_12', 'decision_advice_001', 'externe12@example.com', 'Thomas Faure', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_13', 'decision_advice_001', 'externe13@example.com', 'Sarah Durand', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_14', 'decision_advice_001', 'externe14@example.com', 'Alexandre Blanc', 'EXTERNAL', true, NOW(), NOW()),
  ('part_adv_15', 'decision_advice_001', 'externe15@example.com', 'Laura Girard', 'EXTERNAL', true, NOW(), NOW());

-- ============================================================================
-- ÉTAPE 4: Créer les votes pour MAJORITY (ProposalVote)
-- ============================================================================
-- Distribution: Logo Moderne=6, Logo Classique=4, Logo Créatif=5
-- Winner: Logo Moderne

INSERT INTO "ProposalVote" ("id", "decisionId", "proposalId", "externalParticipantId", "createdAt", "updatedAt") VALUES
  ('vote_maj_01', 'decision_majority_001', 'proposal_maj_1', 'part_maj_01', NOW(), NOW()),
  ('vote_maj_02', 'decision_majority_001', 'proposal_maj_1', 'part_maj_02', NOW(), NOW()),
  ('vote_maj_03', 'decision_majority_001', 'proposal_maj_1', 'part_maj_03', NOW(), NOW()),
  ('vote_maj_04', 'decision_majority_001', 'proposal_maj_1', 'part_maj_04', NOW(), NOW()),
  ('vote_maj_05', 'decision_majority_001', 'proposal_maj_1', 'part_maj_05', NOW(), NOW()),
  ('vote_maj_06', 'decision_majority_001', 'proposal_maj_1', 'part_maj_06', NOW(), NOW()),
  ('vote_maj_07', 'decision_majority_001', 'proposal_maj_2', 'part_maj_07', NOW(), NOW()),
  ('vote_maj_08', 'decision_majority_001', 'proposal_maj_2', 'part_maj_08', NOW(), NOW()),
  ('vote_maj_09', 'decision_majority_001', 'proposal_maj_2', 'part_maj_09', NOW(), NOW()),
  ('vote_maj_10', 'decision_majority_001', 'proposal_maj_2', 'part_maj_10', NOW(), NOW()),
  ('vote_maj_11', 'decision_majority_001', 'proposal_maj_3', 'part_maj_11', NOW(), NOW()),
  ('vote_maj_12', 'decision_majority_001', 'proposal_maj_3', 'part_maj_12', NOW(), NOW()),
  ('vote_maj_13', 'decision_majority_001', 'proposal_maj_3', 'part_maj_13', NOW(), NOW()),
  ('vote_maj_14', 'decision_majority_001', 'proposal_maj_3', 'part_maj_14', NOW(), NOW()),
  ('vote_maj_15', 'decision_majority_001', 'proposal_maj_3', 'part_maj_15', NOW(), NOW());

-- ============================================================================
-- ÉTAPE 5: Créer les votes pour NUANCED_VOTE (NuancedVote)
-- ============================================================================
-- Échelle 5 niveaux: EXCELLENT, GOOD, PASSABLE, INSUFFICIENT, TO_REJECT
-- Chaque participant évalue chaque proposition (15 x 4 = 60 votes)

-- Participant 1
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_01_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_01', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_01_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_01', 'GOOD', NOW(), NOW()),
  ('nua_vote_01_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_01', 'PASSABLE', NOW(), NOW()),
  ('nua_vote_01_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_01', 'GOOD', NOW(), NOW());

-- Participant 2
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_02_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_02', 'GOOD', NOW(), NOW()),
  ('nua_vote_02_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_02', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_02_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_02', 'GOOD', NOW(), NOW()),
  ('nua_vote_02_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_02', 'PASSABLE', NOW(), NOW());

-- Participant 3
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_03_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_03', 'GOOD', NOW(), NOW()),
  ('nua_vote_03_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_03', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_03_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_03', 'INSUFFICIENT', NOW(), NOW()),
  ('nua_vote_03_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_03', 'GOOD', NOW(), NOW());

-- Participant 4
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_04_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_04', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_04_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_04', 'GOOD', NOW(), NOW()),
  ('nua_vote_04_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_04', 'PASSABLE', NOW(), NOW()),
  ('nua_vote_04_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_04', 'EXCELLENT', NOW(), NOW());

-- Participant 5
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_05_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_05', 'GOOD', NOW(), NOW()),
  ('nua_vote_05_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_05', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_05_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_05', 'GOOD', NOW(), NOW()),
  ('nua_vote_05_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_05', 'GOOD', NOW(), NOW());

-- Participant 6
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_06_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_06', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_06_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_06', 'GOOD', NOW(), NOW()),
  ('nua_vote_06_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_06', 'PASSABLE', NOW(), NOW()),
  ('nua_vote_06_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_06', 'EXCELLENT', NOW(), NOW());

-- Participant 7
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_07_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_07', 'GOOD', NOW(), NOW()),
  ('nua_vote_07_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_07', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_07_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_07', 'INSUFFICIENT', NOW(), NOW()),
  ('nua_vote_07_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_07', 'PASSABLE', NOW(), NOW());

-- Participant 8
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_08_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_08', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_08_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_08', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_08_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_08', 'GOOD', NOW(), NOW()),
  ('nua_vote_08_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_08', 'GOOD', NOW(), NOW());

-- Participant 9
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_09_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_09', 'GOOD', NOW(), NOW()),
  ('nua_vote_09_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_09', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_09_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_09', 'PASSABLE', NOW(), NOW()),
  ('nua_vote_09_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_09', 'EXCELLENT', NOW(), NOW());

-- Participant 10
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_10_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_10', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_10_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_10', 'GOOD', NOW(), NOW()),
  ('nua_vote_10_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_10', 'INSUFFICIENT', NOW(), NOW()),
  ('nua_vote_10_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_10', 'GOOD', NOW(), NOW());

-- Participant 11
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_11_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_11', 'GOOD', NOW(), NOW()),
  ('nua_vote_11_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_11', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_11_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_11', 'PASSABLE', NOW(), NOW()),
  ('nua_vote_11_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_11', 'EXCELLENT', NOW(), NOW());

-- Participant 12
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_12_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_12', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_12_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_12', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_12_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_12', 'GOOD', NOW(), NOW()),
  ('nua_vote_12_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_12', 'PASSABLE', NOW(), NOW());

-- Participant 13
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_13_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_13', 'GOOD', NOW(), NOW()),
  ('nua_vote_13_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_13', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_13_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_13', 'INSUFFICIENT', NOW(), NOW()),
  ('nua_vote_13_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_13', 'GOOD', NOW(), NOW());

-- Participant 14
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_14_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_14', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_14_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_14', 'GOOD', NOW(), NOW()),
  ('nua_vote_14_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_14', 'PASSABLE', NOW(), NOW()),
  ('nua_vote_14_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_14', 'EXCELLENT', NOW(), NOW());

-- Participant 15
INSERT INTO "NuancedVote" ("id", "decisionId", "proposalId", "externalParticipantId", "mention", "createdAt", "updatedAt") VALUES
  ('nua_vote_15_1', 'decision_nuanced_001', 'proposal_nua_1', 'part_nua_15', 'GOOD', NOW(), NOW()),
  ('nua_vote_15_2', 'decision_nuanced_001', 'proposal_nua_2', 'part_nua_15', 'EXCELLENT', NOW(), NOW()),
  ('nua_vote_15_3', 'decision_nuanced_001', 'proposal_nua_3', 'part_nua_15', 'GOOD', NOW(), NOW()),
  ('nua_vote_15_4', 'decision_nuanced_001', 'proposal_nua_4', 'part_nua_15', 'GOOD', NOW(), NOW());

-- ============================================================================
-- ÉTAPE 6: Créer les votes pour CONSENSUS (Vote avec value='AGREE')
-- ============================================================================

INSERT INTO "Vote" ("id", "decisionId", "externalParticipantId", "value", "createdAt", "updatedAt") VALUES
  ('vote_con_01', 'decision_consensus_001', 'part_con_01', 'AGREE', NOW(), NOW()),
  ('vote_con_02', 'decision_consensus_001', 'part_con_02', 'AGREE', NOW(), NOW()),
  ('vote_con_03', 'decision_consensus_001', 'part_con_03', 'AGREE', NOW(), NOW()),
  ('vote_con_04', 'decision_consensus_001', 'part_con_04', 'AGREE', NOW(), NOW()),
  ('vote_con_05', 'decision_consensus_001', 'part_con_05', 'AGREE', NOW(), NOW()),
  ('vote_con_06', 'decision_consensus_001', 'part_con_06', 'AGREE', NOW(), NOW()),
  ('vote_con_07', 'decision_consensus_001', 'part_con_07', 'AGREE', NOW(), NOW()),
  ('vote_con_08', 'decision_consensus_001', 'part_con_08', 'AGREE', NOW(), NOW()),
  ('vote_con_09', 'decision_consensus_001', 'part_con_09', 'AGREE', NOW(), NOW()),
  ('vote_con_10', 'decision_consensus_001', 'part_con_10', 'AGREE', NOW(), NOW()),
  ('vote_con_11', 'decision_consensus_001', 'part_con_11', 'AGREE', NOW(), NOW()),
  ('vote_con_12', 'decision_consensus_001', 'part_con_12', 'AGREE', NOW(), NOW()),
  ('vote_con_13', 'decision_consensus_001', 'part_con_13', 'AGREE', NOW(), NOW()),
  ('vote_con_14', 'decision_consensus_001', 'part_con_14', 'AGREE', NOW(), NOW()),
  ('vote_con_15', 'decision_consensus_001', 'part_con_15', 'AGREE', NOW(), NOW());

-- ============================================================================
-- ÉTAPE 7: Créer les objections pour CONSENT (ConsentObjection)
-- ============================================================================

INSERT INTO "ConsentObjection" ("id", "decisionId", "externalParticipantId", "status", "createdAt", "updatedAt") VALUES
  ('obj_cns_01', 'decision_consent_001', 'part_cns_01', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_02', 'decision_consent_001', 'part_cns_02', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_03', 'decision_consent_001', 'part_cns_03', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_04', 'decision_consent_001', 'part_cns_04', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_05', 'decision_consent_001', 'part_cns_05', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_06', 'decision_consent_001', 'part_cns_06', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_07', 'decision_consent_001', 'part_cns_07', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_08', 'decision_consent_001', 'part_cns_08', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_09', 'decision_consent_001', 'part_cns_09', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_10', 'decision_consent_001', 'part_cns_10', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_11', 'decision_consent_001', 'part_cns_11', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_12', 'decision_consent_001', 'part_cns_12', 'NO_OBJECTION', NOW(), NOW()),
  ('obj_cns_13', 'decision_consent_001', 'part_cns_13', 'NO_POSITION', NOW(), NOW()),
  ('obj_cns_14', 'decision_consent_001', 'part_cns_14', 'NO_POSITION', NOW(), NOW()),
  ('obj_cns_15', 'decision_consent_001', 'part_cns_15', 'NO_OBJECTION', NOW(), NOW());

-- ============================================================================
-- ÉTAPE 8: Créer les avis pour ADVICE_SOLICITATION (OpinionResponse)
-- ============================================================================

INSERT INTO "OpinionResponse" ("id", "decisionId", "externalParticipantId", "opinion", "createdAt", "updatedAt") VALUES
  ('opi_adv_01', 'decision_advice_001', 'part_adv_01', 'Excellent choix. Jira est très complet et la formation est indispensable.', NOW(), NOW()),
  ('opi_adv_02', 'decision_advice_001', 'part_adv_02', 'Je recommande vivement. Notre équipe précédente utilisait Jira avec succès.', NOW(), NOW()),
  ('opi_adv_03', 'decision_advice_001', 'part_adv_03', 'Attention au coût de formation. Prévoir un budget supplémentaire.', NOW(), NOW()),
  ('opi_adv_04', 'decision_advice_001', 'part_adv_04', 'Parfait pour la gestion de projets complexes. Go pour moi.', NOW(), NOW()),
  ('opi_adv_05', 'decision_advice_001', 'part_adv_05', 'Confluence est un plus pour la documentation. Bonne décision.', NOW(), NOW()),
  ('opi_adv_06', 'decision_advice_001', 'part_adv_06', 'Je valide. Prévoir un référent interne pour accompagner l''adoption.', NOW(), NOW()),
  ('opi_adv_07', 'decision_advice_001', 'part_adv_07', 'Très bon choix. Attention à bien former tous les profils utilisateurs.', NOW(), NOW()),
  ('opi_adv_08', 'decision_advice_001', 'part_adv_08', 'OK mais prévoir une phase pilote sur 1 équipe avant le déploiement global.', NOW(), NOW()),
  ('opi_adv_09', 'decision_advice_001', 'part_adv_09', 'Jira peut être complexe au début. La formation est une excellente idée.', NOW(), NOW()),
  ('opi_adv_10', 'decision_advice_001', 'part_adv_10', 'Je recommande fortement. Pensez aussi aux plugins pour étendre les fonctionnalités.', NOW(), NOW()),
  ('opi_adv_11', 'decision_advice_001', 'part_adv_11', 'Parfait. Confluence facilitera le partage de connaissances entre équipes.', NOW(), NOW()),
  ('opi_adv_12', 'decision_advice_001', 'part_adv_12', 'Bon investissement. Prévoir un temps d''adaptation de 2-3 semaines par personne.', NOW(), NOW()),
  ('opi_adv_13', 'decision_advice_001', 'part_adv_13', 'Je valide. Assurez-vous d''avoir un bon support Atlassian.', NOW(), NOW()),
  ('opi_adv_14', 'decision_advice_001', 'part_adv_14', 'Excellente décision stratégique. Cela va unifier nos processus.', NOW(), NOW()),
  ('opi_adv_15', 'decision_advice_001', 'part_adv_15', 'OK pour moi. Pensez à migrer progressivement les données de Trello/Asana.', NOW(), NOW());

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

-- Vérification des données insérées
SELECT
  d.title,
  d.decisionType,
  d.status,
  d.result,
  COUNT(DISTINCT dp.id) as nb_participants
FROM "Decision" d
LEFT JOIN "DecisionParticipant" dp ON dp."decisionId" = d.id
WHERE d.id LIKE 'decision_%'
GROUP BY d.id, d.title, d.decisionType, d.status, d.result
ORDER BY d.createdAt;
