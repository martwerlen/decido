/**
 * Script pour créer des décisions CONSENT de test avec Prisma ORM
 * Usage: node scripts/seed-consent-decisions-prisma.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function cuid() {
  // Génération simple d'un CUID-like
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function main() {
  console.log('🌱 Début du seeding des décisions CONSENT...\n');

  // 1. Trouver l'organisation APM
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { contains: 'APM' } },
        { slug: { contains: 'apm' } }
      ]
    },
  });

  if (!org) {
    console.error('❌ Organisation APM non trouvée');
    return;
  }
  console.log(`✅ Organisation trouvée: ${org.name} (${org.slug})`);

  // 2. Trouver Martin WERLEN
  const creator = await prisma.user.findFirst({
    where: {
      OR: [
        {
          AND: [
            { name: { contains: 'Martin' } },
            { email: { contains: 'werlen' } }
          ]
        },
        { email: { contains: 'martin@' } }
      ]
    },
  });

  if (!creator) {
    console.error('❌ Martin WERLEN non trouvé');
    return;
  }
  console.log(`✅ Créateur trouvé: ${creator.name} (${creator.email})`);

  // 3. Trouver les membres de l'organisation
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: true },
    take: 5,
  });

  if (members.length < 3) {
    console.error('❌ Pas assez de membres trouvés (minimum 3 requis)');
    return;
  }
  console.log(`✅ ${members.length} membres trouvés\n`);

  const participantIds = members
    .slice(0, 3)
    .map(m => m.userId)
    .filter(id => id !== null);

  if (participantIds.length < 3) {
    console.error('❌ Pas assez de participants valides');
    return;
  }

  const now = new Date();

  // Fonction helper pour créer une décision
  async function createDecision(config) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - config.daysAgo);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + config.durationDays);

    console.log(`📝 Création: ${config.title}...`);

    try {
      const decision = await prisma.decision.create({
        data: {
          title: config.title,
          description: `Décision de test au stade ${config.stage} (mode ${config.mode === 'MERGED' ? 'CLARIFAVIS' : 'DISTINCT'})`,
          decisionType: 'CONSENT',
          status: config.stage === 'TERMINEE' ? 'CLOSED' : 'OPEN',
          result: config.stage === 'TERMINEE' ? 'APPROVED' : null,
          votingMode: 'INVITED',
          organizationId: org.id,
          creatorId: creator.id,
          initialProposal: `Proposition initiale pour ${config.title}. Ceci est un texte de test pour simuler une proposition de décision par consentement.`,
          proposal: config.amendProposal
            ? `Proposition amendée pour ${config.title}. Le créateur a modifié la proposition suite aux retours.`
            : `Proposition initiale pour ${config.title}. Ceci est un texte de test pour simuler une proposition de décision par consentement.`,
          consentStepMode: config.mode,
          consentCurrentStage: config.stage,
          consentAmendmentAction: config.amendmentAction || null,
          startDate,
          endDate,
          decidedAt: config.stage === 'TERMINEE' ? endDate : null,
        },
      });

      // Ajouter les participants
      for (const userId of participantIds) {
        await prisma.decisionParticipant.create({
          data: {
            decisionId: decision.id,
            userId,
            invitedVia: 'MANUAL',
            hasVoted: config.hasVoted || false,
          },
        });
      }

      // Ajouter des questions de clarification
      if (config.addQuestions) {
        await prisma.clarificationQuestion.create({
          data: {
            decisionId: decision.id,
            questionerId: participantIds[0],
            questionText: 'Pouvez-vous préciser le budget alloué à cette proposition ?',
            answerText: 'Le budget prévu est de 5000€, financé par la ligne budgétaire "Projets innovants".',
            answererId: creator.id,
            answeredAt: new Date(startDate.getTime() + 12 * 60 * 60 * 1000),
          },
        });

        await prisma.clarificationQuestion.create({
          data: {
            decisionId: decision.id,
            questionerId: participantIds[1],
            questionText: 'Quel est le calendrier prévu pour la mise en œuvre ?',
            answerText: null,
          },
        });
      }

      // Ajouter un avis pour CLARIFAVIS
      if (config.addOpinion) {
        await prisma.opinionResponse.create({
          data: {
            decisionId: decision.id,
            userId: participantIds[0],
            content: 'Je trouve cette proposition très pertinente. Elle répond à un vrai besoin de notre organisation.',
          },
        });
      }

      // Ajouter des objections
      if (config.addObjections) {
        for (const userId of participantIds) {
          await prisma.consentObjection.create({
            data: {
              decisionId: decision.id,
              userId,
              status: 'NO_OBJECTION',
              objectionText: null,
            },
          });
        }
      }

      console.log(`   ✅ Créée avec succès`);
      return decision;

    } catch (error) {
      console.error(`   ❌ Erreur:`, error.message);
      return null;
    }
  }

  // Créer les 12 décisions

  // CLARIFICATIONS (mode DISTINCT) - 2 décisions
  await createDecision({
    title: 'Rénovation de la salle de réunion - Clarifications 1',
    stage: 'CLARIFICATIONS',
    mode: 'DISTINCT',
    daysAgo: 1,
    durationDays: 14,
    addQuestions: true,
  });

  await createDecision({
    title: 'Mise en place du télétravail - Clarifications 2',
    stage: 'CLARIFICATIONS',
    mode: 'DISTINCT',
    daysAgo: 2,
    durationDays: 14,
    addQuestions: true,
  });

  // CLARIFAVIS (mode MERGED) - 2 décisions
  await createDecision({
    title: 'Nouvelle politique de congés - Clarifavis 1',
    stage: 'CLARIFAVIS',
    mode: 'MERGED',
    daysAgo: 3,
    durationDays: 14,
    addQuestions: true,
    addOpinion: true,
  });

  await createDecision({
    title: 'Budget formation 2025 - Clarifavis 2',
    stage: 'CLARIFAVIS',
    mode: 'MERGED',
    daysAgo: 4,
    durationDays: 14,
    addQuestions: true,
  });

  // AVIS (mode DISTINCT) - 2 décisions
  await createDecision({
    title: 'Choix du nouveau logiciel CRM - Avis 1',
    stage: 'AVIS',
    mode: 'DISTINCT',
    daysAgo: 6,
    durationDays: 14,
    addQuestions: true,
  });

  await createDecision({
    title: 'Réorganisation des équipes - Avis 2',
    stage: 'AVIS',
    mode: 'DISTINCT',
    daysAgo: 7,
    durationDays: 14,
    addQuestions: true,
  });

  // AMENDEMENTS - 2 décisions
  await createDecision({
    title: 'Règlement intérieur modifié - Amendements 1',
    stage: 'AMENDEMENTS',
    mode: 'DISTINCT',
    daysAgo: 9,
    durationDays: 14,
    addQuestions: true,
  });

  await createDecision({
    title: 'Charte environnementale - Amendements 2',
    stage: 'AMENDEMENTS',
    mode: 'MERGED',
    daysAgo: 10,
    durationDays: 14,
    addQuestions: true,
  });

  // OBJECTIONS - 2 décisions
  await createDecision({
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

  await createDecision({
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
  await createDecision({
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

  await createDecision({
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

  console.log('\n✅ Seeding terminé avec succès !');
  console.log('📊 12 décisions CONSENT créées (2 par stade)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur globale:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
