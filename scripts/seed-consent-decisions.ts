/**
 * Script pour créer des décisions CONSENT de test à différents stades
 * Usage: npx tsx scripts/seed-consent-decisions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding des décisions CONSENT...\n');

  // 1. Trouver l'organisation APM
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'APM' } },
  });

  if (!org) {
    console.error('❌ Organisation APM non trouvée');
    return;
  }
  console.log(`✅ Organisation trouvée: ${org.name} (${org.slug})`);

  // 2. Trouver Martin WERLEN
  const creator = await prisma.user.findFirst({
    where: {
      name: { contains: 'Martin' },
      email: { contains: 'werlen' },
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
    take: 5, // Prendre les 5 premiers membres
  });

  if (members.length === 0) {
    console.error('❌ Aucun membre trouvé');
    return;
  }
  console.log(`✅ ${members.length} membres trouvés\n`);

  const now = new Date();

  // Fonction helper pour créer une décision
  async function createDecision(config: {
    title: string;
    stage: string;
    mode: 'MERGED' | 'DISTINCT';
    daysAgo: number;
    durationDays: number;
  }) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - config.daysAgo);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + config.durationDays);

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
        proposal: config.stage === 'AMENDEMENTS' || config.stage === 'OBJECTIONS' || config.stage === 'TERMINEE'
          ? `Proposition amendée pour ${config.title}. Le créateur a modifié la proposition suite aux retours.`
          : `Proposition initiale pour ${config.title}. Ceci est un texte de test pour simuler une proposition de décision par consentement.`,
        consentStepMode: config.mode,
        consentCurrentStage: config.stage,
        consentAmendmentAction: config.stage === 'OBJECTIONS' || config.stage === 'TERMINEE' ? 'AMENDED' : null,
        startDate,
        endDate,
        decidedAt: config.stage === 'TERMINEE' ? endDate : null,
      },
    });

    // Ajouter les participants
    const participantIds = members.slice(0, 3).map(m => m.userId).filter(id => id !== null) as string[];

    for (const userId of participantIds) {
      await prisma.decisionParticipant.create({
        data: {
          decisionId: decision.id,
          userId,
          invitedVia: 'MANUAL',
          hasVoted: config.stage === 'TERMINEE' || config.stage === 'OBJECTIONS',
        },
      });
    }

    // Ajouter quelques questions de clarification pour certains stades
    if (['CLARIFICATIONS', 'CLARIFAVIS', 'AVIS', 'AMENDEMENTS'].includes(config.stage)) {
      await prisma.clarificationQuestion.create({
        data: {
          decisionId: decision.id,
          questionerId: participantIds[0],
          questionText: 'Pouvez-vous préciser le budget alloué à cette proposition ?',
          answerText: 'Le budget prévu est de 5000€, financé par la ligne budgétaire "Projets innovants".',
          answererId: creator.id,
          answeredAt: new Date(startDate.getTime() + 12 * 60 * 60 * 1000), // 12h après le début
        },
      });

      await prisma.clarificationQuestion.create({
        data: {
          decisionId: decision.id,
          questionerId: participantIds[1],
          questionText: 'Quel est le calendrier prévu pour la mise en œuvre ?',
          answerText: null, // Question sans réponse
        },
      });
    }

    // Ajouter des avis pour le mode CLARIFAVIS
    if (config.stage === 'CLARIFAVIS' && config.mode === 'MERGED') {
      await prisma.opinionResponse.create({
        data: {
          decisionId: decision.id,
          userId: participantIds[0],
          content: 'Je trouve cette proposition très pertinente. Elle répond à un vrai besoin de notre organisation.',
        },
      });
    }

    // Ajouter des objections pour les stades OBJECTIONS et TERMINEE
    if (config.stage === 'OBJECTIONS' || config.stage === 'TERMINEE') {
      await prisma.consentObjection.create({
        data: {
          decisionId: decision.id,
          userId: participantIds[0],
          status: 'NO_OBJECTION',
        },
      });

      await prisma.consentObjection.create({
        data: {
          decisionId: decision.id,
          userId: participantIds[1],
          status: 'NO_OBJECTION',
        },
      });

      await prisma.consentObjection.create({
        data: {
          decisionId: decision.id,
          userId: participantIds[2],
          status: 'NO_OBJECTION',
        },
      });
    }

    console.log(`✅ Créé: ${config.title} (${config.stage})`);
    return decision;
  }

  // Créer 2 décisions pour chaque stade

  // CLARIFICATIONS (mode DISTINCT) - en cours depuis 1 jour sur 14 jours
  await createDecision({
    title: 'Rénovation de la salle de réunion - Clarifications 1',
    stage: 'CLARIFICATIONS',
    mode: 'DISTINCT',
    daysAgo: 1,
    durationDays: 14,
  });

  await createDecision({
    title: 'Mise en place du télétravail - Clarifications 2',
    stage: 'CLARIFICATIONS',
    mode: 'DISTINCT',
    daysAgo: 2,
    durationDays: 14,
  });

  // CLARIFAVIS (mode MERGED) - en cours depuis 3 jours sur 14 jours
  await createDecision({
    title: 'Nouvelle politique de congés - Clarifavis 1',
    stage: 'CLARIFAVIS',
    mode: 'MERGED',
    daysAgo: 3,
    durationDays: 14,
  });

  await createDecision({
    title: 'Budget formation 2025 - Clarifavis 2',
    stage: 'CLARIFAVIS',
    mode: 'MERGED',
    daysAgo: 4,
    durationDays: 14,
  });

  // AVIS (mode DISTINCT) - en cours depuis 6 jours sur 14 jours
  await createDecision({
    title: 'Choix du nouveau logiciel CRM - Avis 1',
    stage: 'AVIS',
    mode: 'DISTINCT',
    daysAgo: 6,
    durationDays: 14,
  });

  await createDecision({
    title: 'Réorganisation des équipes - Avis 2',
    stage: 'AVIS',
    mode: 'DISTINCT',
    daysAgo: 7,
    durationDays: 14,
  });

  // AMENDEMENTS (mode DISTINCT) - en cours depuis 9 jours sur 14 jours
  await createDecision({
    title: 'Règlement intérieur modifié - Amendements 1',
    stage: 'AMENDEMENTS',
    mode: 'DISTINCT',
    daysAgo: 9,
    durationDays: 14,
  });

  await createDecision({
    title: 'Charte environnementale - Amendements 2',
    stage: 'AMENDEMENTS',
    mode: 'MERGED',
    daysAgo: 10,
    durationDays: 14,
  });

  // OBJECTIONS (mode DISTINCT) - en cours depuis 12 jours sur 14 jours
  await createDecision({
    title: 'Nouveau système de paie - Objections 1',
    stage: 'OBJECTIONS',
    mode: 'DISTINCT',
    daysAgo: 12,
    durationDays: 14,
  });

  await createDecision({
    title: 'Politique de mobilité douce - Objections 2',
    stage: 'OBJECTIONS',
    mode: 'MERGED',
    daysAgo: 13,
    durationDays: 14,
  });

  // TERMINEE - terminées il y a quelques jours
  await createDecision({
    title: 'Achat de matériel informatique - Terminée 1',
    stage: 'TERMINEE',
    mode: 'DISTINCT',
    daysAgo: 21,
    durationDays: 14,
  });

  await createDecision({
    title: 'Partenariat avec association locale - Terminée 2',
    stage: 'TERMINEE',
    mode: 'MERGED',
    daysAgo: 28,
    durationDays: 14,
  });

  console.log('\n✅ Seeding terminé avec succès !');
  console.log('📊 12 décisions CONSENT créées (2 par stade)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
