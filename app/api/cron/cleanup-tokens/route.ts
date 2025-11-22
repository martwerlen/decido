import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API endpoint pour nettoyer les tokens et données expirés
 *
 * Ce script supprime les données expirées pour optimiser la base de données :
 * - Invitations expirées (> 7 jours)
 * - Tokens de vote externes expirés
 * - Logs de votes anonymes de décisions fermées (> 30 jours)
 * - Tokens de réinitialisation de mot de passe expirés
 *
 * Fréquence recommandée: Quotidien à 2h UTC
 *
 * Sécurité: Requiert un Bearer token (CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification du token d'autorisation
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && token !== cronSecret) {
      return Response.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      );
    }

    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Début du nettoyage des données expirées`);

    const results = {
      invitations: 0,
      tokens: 0,
      anonymousLogs: 0,
      passwordResetTokens: 0,
    };

    // 1. Supprimer les invitations expirées
    const expiredInvitations = await prisma.invitation.deleteMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now,
        },
      },
    });
    results.invitations = expiredInvitations.count;
    console.log(`🗑️ ${expiredInvitations.count} invitation(s) expirée(s) supprimée(s)`);

    // 2. Supprimer les tokens de participants externes expirés
    const expiredTokens = await prisma.decisionParticipant.updateMany({
      where: {
        token: { not: null },
        tokenExpiresAt: {
          lt: now,
        },
      },
      data: {
        token: null,
        tokenExpiresAt: null,
      },
    });
    results.tokens = expiredTokens.count;
    console.log(`🗑️ ${expiredTokens.count} token(s) de vote externe(s) expirés nettoyé(s)`);

    // 3. Supprimer les logs de votes anonymes de décisions fermées depuis > 30 jours
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const closedDecisionsIds = await prisma.decision.findMany({
      where: {
        status: {
          in: ['CLOSED', 'IMPLEMENTED', 'ARCHIVED'],
        },
        endDate: {
          lt: thirtyDaysAgo,
        },
      },
      select: { id: true },
    });

    const decisionIds = closedDecisionsIds.map((d) => d.id);

    const deletedLogs = await prisma.anonymousVoteLog.deleteMany({
      where: {
        decisionId: {
          in: decisionIds,
        },
      },
    });
    results.anonymousLogs = deletedLogs.count;
    console.log(`🗑️ ${deletedLogs.count} log(s) de vote(s) anonyme(s) supprimé(s)`);

    // 4. Supprimer les tokens de réinitialisation de mot de passe expirés
    const expiredPasswordTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
    results.passwordResetTokens = expiredPasswordTokens.count;
    console.log(
      `🗑️ ${expiredPasswordTokens.count} token(s) de réinitialisation de mot de passe supprimé(s)`
    );

    console.log(`✅ Nettoyage terminé:`);
    console.log(`   - ${results.invitations} invitations supprimées`);
    console.log(`   - ${results.tokens} tokens nettoyés`);
    console.log(`   - ${results.anonymousLogs} logs de votes anonymes supprimés`);
    console.log(`   - ${results.passwordResetTokens} tokens de réinitialisation supprimés`);

    return Response.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
      total: Object.values(results).reduce((sum, val) => sum + val, 0),
    });
  } catch (error) {
    console.error('❌ Erreur critique dans cleanup-tokens:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
