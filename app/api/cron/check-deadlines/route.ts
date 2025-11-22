import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logDecisionEvent } from '@/lib/decision-logger';

/**
 * API endpoint pour vérifier et fermer automatiquement les décisions dont la date limite est dépassée
 *
 * Cette route doit être appelée régulièrement par un cron job externe
 *
 * Sécurité : Cette route nécessite un token d'autorisation pour éviter les appels non autorisés
 * Passer le token via l'en-tête Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification du token d'autorisation
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    // Si CRON_SECRET est défini, vérifier le token
    if (cronSecret && token !== cronSecret) {
      return Response.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Récupérer toutes les décisions OPEN dont la date limite est dépassée
    const expiredDecisions = await prisma.decision.findMany({
      where: {
        status: 'OPEN',
        endDate: {
          lt: now, // Inférieur à maintenant
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            hasVoted: true,
          },
        },
        votes: {
          select: {
            id: true,
            value: true,
          },
        },
        proposals: {
          include: {
            proposalVotes: true,
          },
        },
        nuancedProposals: {
          include: {
            nuancedVotes: true,
          },
        },
        consentObjections: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const results = {
      total: expiredDecisions.length,
      closed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Traiter chaque décision expirée
    for (const decision of expiredDecisions) {
      try {
        const { decisionType, id: decisionId, participants } = decision;

        // ADVICE_SOLICITATION : on ne fait rien, la décision reste OPEN
        if (decisionType === 'ADVICE_SOLICITATION') {
          results.skipped++;
          continue;
        }

        // Vérifier si tous les participants ont voté
        const allVoted =
          participants.length > 0 &&
          participants.every((p) => p.hasVoted);

        // Calculer le résultat selon le type de décision
        let result: 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'WITHDRAWN' = 'WITHDRAWN';

        switch (decisionType) {
          case 'CONSENSUS': {
            const votes = decision.votes || [];
            if (votes.length === 0) {
              result = 'REJECTED';
            } else {
              const agreeCount = votes.filter((v) => v.value === 'AGREE').length;
              const disagreeCount = votes.filter((v) => v.value === 'DISAGREE').length;
              const totalVotes = agreeCount + disagreeCount;

              result = totalVotes > 0 && disagreeCount === 0 ? 'APPROVED' : 'REJECTED';
            }
            break;
          }

          case 'CONSENT': {
            const objections = decision.consentObjections || [];
            if (objections.length === 0) {
              result = 'REJECTED'; // Pas de participation = rejeté
            } else {
              const hasRealObjection = objections.some((obj) => obj.status === 'OBJECTION');
              result = hasRealObjection ? 'BLOCKED' : 'APPROVED';
            }
            break;
          }

          case 'MAJORITY': {
            const proposals = decision.proposals || [];
            const totalVotes = proposals.reduce((sum, p) => sum + p.proposalVotes.length, 0);
            result = totalVotes > 0 ? 'APPROVED' : 'REJECTED';
            break;
          }

          case 'SUPERMAJORITY': {
            const proposals = decision.proposals || [];
            const totalVotes = proposals.reduce((sum, p) => sum + p.proposalVotes.length, 0);
            result = totalVotes > 0 ? 'APPROVED' : 'REJECTED';
            break;
          }

          case 'NUANCED_VOTE': {
            const nuancedProposals = decision.nuancedProposals || [];
            const totalVotes = nuancedProposals.reduce(
              (sum, p) => sum + p.nuancedVotes.length,
              0
            );
            result = totalVotes > 0 ? 'APPROVED' : 'REJECTED';
            break;
          }

          case 'ADVISORY': {
            const votes = decision.votes || [];
            result = votes.length > 0 ? 'APPROVED' : 'REJECTED';
            break;
          }

          default:
            result = 'WITHDRAWN';
        }

        // Métadonnées de fermeture
        const closureMetadata = {
          reason: 'deadline_reached',
          closedAt: now.toISOString(),
          allVoted,
        };

        // Mettre à jour la décision
        const updateData: any = {
          status: 'CLOSED',
          result,
        };

        // Pour CONSENT, mettre à jour le stage
        if (decisionType === 'CONSENT') {
          updateData.consentCurrentStage = 'TERMINEE';
        }

        await prisma.decision.update({
          where: { id: decisionId },
          data: updateData,
        });

        // Logger l'événement
        await logDecisionEvent({
          decisionId,
          eventType: 'CLOSED',
          metadata: {
            reason: 'deadline_reached',
            automaticClosure: true,
            result,
            allVoted,
          },
        });

        results.closed++;
      } catch (error) {
        console.error(`Error closing decision ${decision.id}:`, error);
        results.errors.push(`Decision ${decision.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return Response.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Error in check-deadlines cron:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
