#!/usr/bin/env node

/**
 * Cron Job: Nettoyer les tokens expirés
 * Fréquence: Tous les jours à 2h du matin (UTC)
 *
 * Ce script supprime :
 * - Les invitations expirées (> 7 jours)
 * - Les tokens de vote externe expirés
 * - Les logs de vote anonyme de plus de 90 jours
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupTokens() {
  console.log(`⏰ [${new Date().toISOString()}] Début du cron: nettoyage des tokens`);

  try {
    const now = new Date();

    // 1. Supprimer les invitations expirées ou annulées de plus de 30 jours
    const oldInvitations = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const deletedInvitations = await prisma.invitation.deleteMany({
      where: {
        OR: [
          {
            status: 'EXPIRED',
            createdAt: { lt: oldInvitations }
          },
          {
            status: 'CANCELLED',
            createdAt: { lt: oldInvitations }
          }
        ]
      }
    });

    console.log(`🗑️ ${deletedInvitations.count} invitation(s) expirée(s) supprimée(s)`);

    // 2. Marquer comme expirées les invitations PENDING de plus de 7 jours
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const expiredInvitations = await prisma.invitation.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: sevenDaysAgo }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    console.log(`⏰ ${expiredInvitations.count} invitation(s) marquée(s) comme expirée(s)`);

    // 3. Marquer comme expirés les tokens de participants externes dont la décision est terminée
    const expiredParticipants = await prisma.decisionParticipant.updateMany({
      where: {
        token: { not: null },
        tokenExpiresAt: { lt: now },
        decision: {
          status: { in: ['CLOSED', 'ARCHIVED'] }
        }
      },
      data: {
        token: null,
        tokenExpiresAt: null
      }
    });

    console.log(`🔒 ${expiredParticipants.count} token(s) de participant externe supprimé(s)`);

    // 4. Supprimer les logs de vote anonyme de plus de 90 jours
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const deletedLogs = await prisma.anonymousVoteLog.deleteMany({
      where: {
        votedAt: { lt: ninetyDaysAgo }
      }
    });

    console.log(`🧹 ${deletedLogs.count} log(s) de vote anonyme supprimé(s)`);

    // 5. Statistiques globales
    const stats = await getCleanupStats();
    console.log('\n📊 Statistiques après nettoyage:');
    console.log(`   - Invitations PENDING: ${stats.pendingInvitations}`);
    console.log(`   - Tokens de vote actifs: ${stats.activeTokens}`);
    console.log(`   - Logs anonymes (total): ${stats.anonymousLogs}`);

    console.log('\n✅ Cron de nettoyage terminé avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur durant le cron:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function getCleanupStats() {
  const [pendingInvitations, activeTokens, anonymousLogs] = await Promise.all([
    prisma.invitation.count({
      where: { status: 'PENDING' }
    }),
    prisma.decisionParticipant.count({
      where: {
        token: { not: null },
        tokenExpiresAt: { gte: new Date() }
      }
    }),
    prisma.anonymousVoteLog.count()
  ]);

  return { pendingInvitations, activeTokens, anonymousLogs };
}

cleanupTokens();
