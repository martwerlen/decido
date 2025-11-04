import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { logVoteRecorded, logVoteUpdated } from '@/lib/decision-logger';

/**
 * Hash une adresse IP pour anonymisation
 */
function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Récupère l'adresse IP du client
 */
function getClientIP(request: NextRequest): string {
  // Essayer différents headers selon la configuration du proxy/CDN
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (ne devrait pas arriver en production)
  return 'unknown';
}

/**
 * GET /api/vote/[orgSlug]/[publicSlug]
 * Récupère les informations de la décision (pas encore implémenté, optionnel)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; publicSlug: string }> }
) {
  try {
    const { orgSlug, publicSlug } = await params;

    // Récupérer l'organisation
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        organizationId: org.id,
        publicSlug: publicSlug,
        votingMode: 'PUBLIC_LINK',
      },
    });

    if (!decision) {
      return NextResponse.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier si cette IP a déjà voté
    const clientIP = getClientIP(request);
    const ipHash = hashIP(clientIP);

    const existingVote = await prisma.anonymousVoteLog.findUnique({
      where: {
        decisionId_ipHash: {
          decisionId: decision.id,
          ipHash: ipHash,
        },
      },
    });

    return NextResponse.json({
      decision: {
        id: decision.id,
        title: decision.title,
        description: decision.description,
        decisionType: decision.decisionType,
      },
      hasVoted: !!existingVote,
    });
  } catch (error) {
    console.error('Error fetching decision:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la décision' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vote/[orgSlug]/[publicSlug]
 * Enregistre un vote anonyme
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; publicSlug: string }> }
) {
  try {
    const { orgSlug, publicSlug } = await params;
    const body = await request.json();

    // Récupérer l'organisation
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        organizationId: org.id,
        publicSlug: publicSlug,
        votingMode: 'PUBLIC_LINK',
      },
      include: {
        proposals: true,
        nuancedProposals: true,
      },
    });

    if (!decision) {
      return NextResponse.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier que la décision est ouverte
    if (decision.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Cette décision n\'est pas ouverte au vote' },
        { status: 400 }
      );
    }

    // Vérifier la deadline
    if (decision.endDate && new Date(decision.endDate) < new Date()) {
      return NextResponse.json(
        { error: 'La date limite pour voter est dépassée' },
        { status: 400 }
      );
    }

    // Récupérer et hasher l'IP
    const clientIP = getClientIP(request);
    const ipHash = hashIP(clientIP);

    // Vérifier si cette IP a déjà voté
    const existingLog = await prisma.anonymousVoteLog.findUnique({
      where: {
        decisionId_ipHash: {
          decisionId: decision.id,
          ipHash: ipHash,
        },
      },
    });

    // Selon le type de décision, enregistrer le vote
    if (decision.decisionType === 'CONSENSUS') {
      const { value } = body;
      if (!value || !['AGREE', 'DISAGREE'].includes(value)) {
        return NextResponse.json(
          { error: 'Valeur de vote invalide pour le consensus' },
          { status: 400 }
        );
      }

      if (existingLog) {
        // Mettre à jour le vote existant
        await prisma.vote.updateMany({
          where: {
            decisionId: decision.id,
            userId: null,
            externalParticipantId: null,
          },
          data: {
            value: value,
            updatedAt: new Date(),
          },
        });

        // Mettre à jour le timestamp du log
        await prisma.anonymousVoteLog.update({
          where: {
            decisionId_ipHash: {
              decisionId: decision.id,
              ipHash: ipHash,
            },
          },
          data: {
            votedAt: new Date(),
          },
        });

        // Logger la mise à jour du vote (anonyme)
        await logVoteUpdated(decision.id);
      } else {
        // Créer un nouveau vote et log
        await prisma.$transaction([
          prisma.vote.create({
            data: {
              decisionId: decision.id,
              value: value,
              userId: null,
              externalParticipantId: null,
            },
          }),
          prisma.anonymousVoteLog.create({
            data: {
              decisionId: decision.id,
              ipHash: ipHash,
            },
          }),
        ]);

        // Logger le nouveau vote (anonyme)
        await logVoteRecorded(decision.id);
      }
    } else if (decision.decisionType === 'MAJORITY') {
      const { proposalId } = body;
      if (!proposalId) {
        return NextResponse.json(
          { error: 'Proposition non sélectionnée' },
          { status: 400 }
        );
      }

      // Vérifier que la proposition existe
      const proposalExists = decision.proposals.some(p => p.id === proposalId);
      if (!proposalExists) {
        return NextResponse.json(
          { error: 'Proposition invalide' },
          { status: 400 }
        );
      }

      if (existingLog) {
        // Mettre à jour le vote existant
        await prisma.proposalVote.updateMany({
          where: {
            decisionId: decision.id,
            userId: null,
            externalParticipantId: null,
          },
          data: {
            proposalId: proposalId,
            updatedAt: new Date(),
          },
        });

        // Mettre à jour le timestamp du log
        await prisma.anonymousVoteLog.update({
          where: {
            decisionId_ipHash: {
              decisionId: decision.id,
              ipHash: ipHash,
            },
          },
          data: {
            votedAt: new Date(),
          },
        });

        // Logger la mise à jour du vote (anonyme)
        await logVoteUpdated(decision.id);
      } else {
        // Créer un nouveau vote et log
        await prisma.$transaction([
          prisma.proposalVote.create({
            data: {
              decisionId: decision.id,
              proposalId: proposalId,
              userId: null,
              externalParticipantId: null,
            },
          }),
          prisma.anonymousVoteLog.create({
            data: {
              decisionId: decision.id,
              ipHash: ipHash,
            },
          }),
        ]);

        // Logger le nouveau vote (anonyme)
        await logVoteRecorded(decision.id);
      }
    } else if (decision.decisionType === 'NUANCED_VOTE') {
      const { votes } = body;
      if (!votes || typeof votes !== 'object') {
        return NextResponse.json(
          { error: 'Votes invalides' },
          { status: 400 }
        );
      }

      // Vérifier que toutes les propositions ont un vote
      const allProposalIds = decision.nuancedProposals.map(p => p.id);
      const votedProposalIds = Object.keys(votes);

      if (!allProposalIds.every(id => votedProposalIds.includes(id))) {
        return NextResponse.json(
          { error: 'Toutes les propositions doivent avoir une mention' },
          { status: 400 }
        );
      }

      if (existingLog) {
        // Supprimer les votes existants et en créer de nouveaux
        await prisma.$transaction([
          prisma.nuancedVote.deleteMany({
            where: {
              decisionId: decision.id,
              userId: null,
              externalParticipantId: null,
            },
          }),
          ...Object.entries(votes).map(([proposalId, mention]) =>
            prisma.nuancedVote.create({
              data: {
                decisionId: decision.id,
                proposalId: proposalId,
                mention: mention as string,
                userId: null,
                externalParticipantId: null,
              },
            })
          ),
          prisma.anonymousVoteLog.update({
            where: {
              decisionId_ipHash: {
                decisionId: decision.id,
                ipHash: ipHash,
              },
            },
            data: {
              votedAt: new Date(),
            },
          }),
        ]);

        // Logger la mise à jour du vote (anonyme)
        await logVoteUpdated(decision.id);
      } else {
        // Créer les votes et le log
        await prisma.$transaction([
          ...Object.entries(votes).map(([proposalId, mention]) =>
            prisma.nuancedVote.create({
              data: {
                decisionId: decision.id,
                proposalId: proposalId,
                mention: mention as string,
                userId: null,
                externalParticipantId: null,
              },
            })
          ),
          prisma.anonymousVoteLog.create({
            data: {
              decisionId: decision.id,
              ipHash: ipHash,
            },
          }),
        ]);

        // Logger le nouveau vote (anonyme)
        await logVoteRecorded(decision.id);
      }
    } else {
      return NextResponse.json(
        { error: 'Type de décision non supporté pour le vote anonyme' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Vote enregistré avec succès',
      isUpdate: !!existingLog,
    });
  } catch (error) {
    console.error('Error recording anonymous vote:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement du vote' },
      { status: 500 }
    );
  }
}
