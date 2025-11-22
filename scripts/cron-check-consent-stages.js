#!/usr/bin/env node

/**
 * Cron Job: Vérifier et mettre à jour les étapes des décisions CONSENT
 * Fréquence: Toutes les 15 minutes
 *
 * Ce script gère la progression automatique des étapes (stages) des décisions CONSENT :
 * - CLARIFICATIONS → AVIS → AMENDEMENTS → OBJECTIONS → TERMINEE (mode DISTINCT)
 * - CLARIFAVIS → AMENDEMENTS → OBJECTIONS → TERMINEE (mode MERGED)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Calcule l'étape actuelle d'une décision CONSENT basée sur les timings
 */
function calculateCurrentStage(decision) {
  const now = new Date();
  const startDate = new Date(decision.startDate);
  const endDate = new Date(decision.endDate);
  const totalDuration = endDate - startDate;

  // Si la décision n'a pas encore commencé
  if (now < startDate) {
    return decision.consentStepMode === 'MERGED' ? 'CLARIFAVIS' : 'CLARIFICATIONS';
  }

  // Si la décision est terminée
  if (now >= endDate) {
    return 'TERMINEE';
  }

  const elapsed = now - startDate;
  const progress = elapsed / totalDuration;

  if (decision.consentStepMode === 'MERGED') {
    // 3 étapes actives (CLARIFAVIS, AMENDEMENTS, OBJECTIONS) + TERMINEE
    // Chaque étape = 33.33% du temps
    if (progress < 0.3333) return 'CLARIFAVIS';
    if (progress < 0.6667) return 'AMENDEMENTS';
    if (progress < 1.0) return 'OBJECTIONS';
    return 'TERMINEE';
  } else {
    // Mode DISTINCT: 4 étapes actives (CLARIFICATIONS, AVIS, AMENDEMENTS, OBJECTIONS) + TERMINEE
    // Chaque étape = 25% du temps
    if (progress < 0.25) return 'CLARIFICATIONS';
    if (progress < 0.50) return 'AVIS';
    if (progress < 0.75) return 'AMENDEMENTS';
    if (progress < 1.0) return 'OBJECTIONS';
    return 'TERMINEE';
  }
}

async function checkConsentStages() {
  const now = new Date();
  console.log(`⏰ [${now.toISOString()}] Début de la vérification des étapes CONSENT`);

  try {
    // Trouver toutes les décisions CONSENT actives
    const consentDecisions = await prisma.decision.findMany({
      where: {
        decisionType: 'CONSENT',
        status: 'OPEN'
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        consentStepMode: true,
        consentCurrentStage: true
      }
    });

    console.log(`📊 ${consentDecisions.length} décision(s) CONSENT active(s) trouvée(s)`);

    let updatedCount = 0;
    let errors = 0;

    for (const decision of consentDecisions) {
      try {
        const calculatedStage = calculateCurrentStage(decision);

        if (calculatedStage !== decision.consentCurrentStage) {
          await prisma.decision.update({
            where: { id: decision.id },
            data: { consentCurrentStage: calculatedStage }
          });

          console.log(`✅ Décision "${decision.title}" (${decision.id}): ${decision.consentCurrentStage} → ${calculatedStage}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour de "${decision.title}":`, error);
        errors++;
      }
    }

    console.log(`✅ Cron terminé: ${updatedCount} décision(s) mise(s) à jour, ${errors} erreur(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur critique:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkConsentStages();
