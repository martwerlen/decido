#!/usr/bin/env node

/**
 * Cron Job: Nettoyer les tokens et invitations expirés
 * Fréquence: Quotidien à 2h UTC
 *
 * Ce script supprime les données expirées pour optimiser la base de données :
 * - Invitations expirées (> 7 jours)
 * - Tokens de vote externes expirés
 * - Logs de votes anonymes de décisions fermées (> 30 jours)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanup() {
  const now = new Date();
  console.log(`⏰ [${now.toISOString()}] Début du nettoyage des données expirées`);

  try {
    // 1. Supprimer les invitations expirées
    const expiredInvitations = await prisma.invitation.deleteMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`🗑️ ${expiredInvitations.count} invitation(s) expirée(s) supprimée(s)`);

    // 2. Supprimer les tokens de participants externes expirés
    const expiredTokens = await prisma.decisionParticipant.updateMany({
      where: {
        token: { not: null },
        tokenExpiresAt: {
          lt: now
        }
      },
      data: {
        token: null,
        tokenExpiresAt: null
      }
    });

    console.log(`🗑️ ${expiredTokens.count} token(s) de vote externe(s) expirés nettoyé(s)`);

    // 3. Supprimer les logs de votes anonymes de décisions fermées depuis > 30 jours
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const closedDecisionsIds = await prisma.decision.findMany({
      where: {
        status: {
          in: ['CLOSED', 'IMPLEMENTED', 'ARCHIVED']
        },
        endDate: {
          lt: thirtyDaysAgo
        }
      },
      select: { id: true }
    });

    const decisionIds = closedDecisionsIds.map(d => d.id);

    const deletedLogs = await prisma.anonymousVoteLog.deleteMany({
      where: {
        decisionId: {
          in: decisionIds
        }
      }
    });

    console.log(`🗑️ ${deletedLogs.count} log(s) de vote(s) anonyme(s) supprimé(s)`);

    // 4. Statistiques finales
    console.log(`✅ Nettoyage terminé:`);
    console.log(`   - ${expiredInvitations.count} invitations supprimées`);
    console.log(`   - ${expiredTokens.count} tokens nettoyés`);
    console.log(`   - ${deletedLogs.count} logs de votes anonymes supprimés`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur critique:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
