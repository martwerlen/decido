import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logVoteRecorded, logVoteUpdated } from '@/lib/decision-logger';

// POST /api/organizations/[slug]/decisions/[decisionId]/vote - Vote pour une décision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug, decisionId } = await params;

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: "Organisation non trouvée" }, { status: 404 });
    }
    const body = await request.json();

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // La décision doit être OPEN
    if (decision.status !== 'OPEN') {
      return Response.json(
        { error: 'Cette décision n\'est pas ouverte au vote' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est autorisé à voter
    if (decision.votingMode === 'INVITED') {
      const participant = await prisma.decisionParticipant.findFirst({
        where: {
          decisionId,
          userId: session.user.id,
        },
      });

      if (!participant) {
        return Response.json(
          { error: 'Vous n\'êtes pas autorisé à voter sur cette décision' },
          { status: 403 }
        );
      }
    }

    // Traiter selon le type de décision
    if (decision.decisionType === 'MAJORITY') {
      // Pour la majorité, on vote pour une proposition
      const { proposalId } = body;

      if (!proposalId) {
        return Response.json(
          { error: 'Une proposition doit être sélectionnée' },
          { status: 400 }
        );
      }

      // Vérifier que la proposition existe
      const proposal = await prisma.proposal.findFirst({
        where: {
          id: proposalId,
          decisionId,
        },
      });

      if (!proposal) {
        return Response.json(
          { error: 'Proposition non trouvée' },
          { status: 404 }
        );
      }

      // Vérifier si l'utilisateur a déjà voté
      const existingVote = await prisma.proposalVote.findFirst({
        where: {
          userId: session.user.id,
          decisionId,
        },
      });

      // Supprimer le vote précédent s'il existe
      await prisma.proposalVote.deleteMany({
        where: {
          userId: session.user.id,
          decisionId,
        },
      });

      // Créer le nouveau vote
      const vote = await prisma.proposalVote.create({
        data: {
          proposalId,
          userId: session.user.id,
          decisionId,
        },
        include: {
          proposal: true,
        },
      });

      // Mettre à jour le statut du participant
      await prisma.decisionParticipant.updateMany({
        where: {
          decisionId,
          userId: session.user.id,
        },
        data: {
          hasVoted: true,
        },
      });

      // Logger le vote (anonyme pour la majorité)
      if (existingVote) {
        await logVoteUpdated(decisionId);
      } else {
        await logVoteRecorded(decisionId);
      }

      return Response.json({ vote, message: 'Vote enregistré avec succès' });
    } else if (decision.decisionType === 'CONSENSUS') {
      // Pour le consensus, on vote AGREE ou DISAGREE
      const { value } = body; // 'AGREE' ou 'DISAGREE'

      if (!value || !['AGREE', 'DISAGREE'].includes(value)) {
        return Response.json(
          { error: 'Valeur de vote invalide (AGREE ou DISAGREE)' },
          { status: 400 }
        );
      }

      // Vérifier si le vote existe déjà
      const existingVote = await prisma.vote.findUnique({
        where: {
          userId_decisionId: {
            userId: session.user.id,
            decisionId,
          },
        },
      });

      // Mettre à jour ou créer le vote
      const vote = await prisma.vote.upsert({
        where: {
          userId_decisionId: {
            userId: session.user.id,
            decisionId,
          },
        },
        update: {
          value,
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          decisionId,
          value,
          weight: value === 'AGREE' ? 1 : 0,
        },
      });

      // Mettre à jour le statut du participant
      await prisma.decisionParticipant.updateMany({
        where: {
          decisionId,
          userId: session.user.id,
        },
        data: {
          hasVoted: true,
        },
      });

      // Logger le vote pour consensus (avec détails du votant et du vote)
      const userName = session.user.name || session.user.email || 'Utilisateur';
      if (existingVote) {
        await logVoteUpdated(
          decisionId,
          session.user.id,
          userName,
          undefined,
          existingVote.value,
          value
        );
      } else {
        await logVoteRecorded(
          decisionId,
          session.user.id,
          userName,
          undefined,
          value
        );
      }

      // Vérifier si tous les participants ont voté "AGREE"
      const allParticipants = await prisma.decisionParticipant.findMany({
        where: { decisionId },
      });

      const allVotes = await prisma.vote.findMany({
        where: { decisionId },
      });

      const allAgree = allParticipants.length > 0 &&
        allVotes.length === allParticipants.length &&
        allVotes.every(v => v.value === 'AGREE');

      // Si tous d'accord, fermer automatiquement la décision
      if (allAgree) {
        await prisma.decision.update({
          where: { id: decisionId },
          data: {
            status: 'CLOSED',
            result: 'APPROVED',
            decidedAt: new Date(),
            resultDetails: 'Consensus atteint - tous les participants sont d\'accord',
          },
        });
      }

      return Response.json({
        vote,
        message: 'Vote enregistré avec succès',
        consensusReached: allAgree,
      });
    } else if (decision.decisionType === 'NUANCED_VOTE') {
      // Pour le vote nuancé, on reçoit un objet { proposalId: mention }
      const { nuancedVotes } = body;

      if (!nuancedVotes || typeof nuancedVotes !== 'object') {
        return Response.json(
          { error: 'Votes nuancés manquants ou invalides' },
          { status: 400 }
        );
      }

      // Récupérer toutes les propositions de la décision
      const proposals = await prisma.nuancedProposal.findMany({
        where: { decisionId },
      });

      if (proposals.length === 0) {
        return Response.json(
          { error: 'Aucune proposition trouvée pour cette décision' },
          { status: 404 }
        );
      }

      // Vérifier que toutes les propositions ont un vote
      const proposalIds = proposals.map(p => p.id);
      for (const proposalId of proposalIds) {
        if (!nuancedVotes[proposalId]) {
          return Response.json(
            { error: 'Toutes les propositions doivent avoir une mention' },
            { status: 400 }
          );
        }
      }

      // Vérifier que les mentions sont valides
      const validMentions = decision.nuancedScale === '3_LEVELS'
        ? ['GOOD', 'PASSABLE', 'INSUFFICIENT']
        : decision.nuancedScale === '5_LEVELS'
        ? ['EXCELLENT', 'GOOD', 'PASSABLE', 'INSUFFICIENT', 'TO_REJECT']
        : ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIRLY_GOOD', 'PASSABLE', 'INSUFFICIENT', 'TO_REJECT'];

      for (const mention of Object.values(nuancedVotes)) {
        if (!validMentions.includes(mention as string)) {
          return Response.json(
            { error: 'Mention invalide détectée' },
            { status: 400 }
          );
        }
      }

      // Vérifier si l'utilisateur a déjà voté
      const existingVotes = await prisma.nuancedVote.findMany({
        where: {
          userId: session.user.id,
          decisionId,
        },
      });

      const hadVoted = existingVotes.length > 0;

      // Supprimer les votes précédents
      if (hadVoted) {
        await prisma.nuancedVote.deleteMany({
          where: {
            userId: session.user.id,
            decisionId,
          },
        });
      }

      // Créer les nouveaux votes
      const voteData = Object.entries(nuancedVotes).map(([proposalId, mention]) => ({
        proposalId,
        mention: mention as string,
        userId: session.user.id,
        decisionId,
      }));

      await prisma.nuancedVote.createMany({
        data: voteData,
      });

      // Mettre à jour le statut du participant
      await prisma.decisionParticipant.updateMany({
        where: {
          decisionId,
          userId: session.user.id,
        },
        data: {
          hasVoted: true,
        },
      });

      // Logger le vote
      if (hadVoted) {
        await logVoteUpdated(decisionId);
      } else {
        await logVoteRecorded(decisionId);
      }

      return Response.json({
        message: 'Vote enregistré avec succès',
        votesCount: voteData.length,
      });
    }

    return Response.json(
      { error: 'Type de décision non supporté pour cette opération' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error voting:', error);
    return Response.json(
      { error: 'Erreur lors de l\'enregistrement du vote' },
      { status: 500 }
    );
  }
}
