import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateNuancedVoteResults } from '@/lib/decision-logic';
import { logDecisionClosed } from '@/lib/decision-logger';
import ResultsPageClient from './ResultsPageClient';

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string; decisionId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { slug, decisionId } = await params;

  // Récupérer l'organisation par son slug
  const organization = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!organization) {
    redirect(`/organizations/${slug}/decisions`);
  }

  // Récupérer la décision
  const decision = await prisma.decision.findFirst({
    where: {
      id: decisionId,
      organizationId: organization.id,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      team: true,
      proposals: {
        orderBy: {
          order: 'asc',
        },
        include: {
          proposalVotes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      nuancedProposals: {
        orderBy: {
          order: 'asc',
        },
        include: {
          nuancedVotes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      comments: {
        where: {
          parentId: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      votes: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!decision) {
    redirect(`/organizations/${slug}/decisions`);
  }

  const isCreator = decision.creatorId === session.user.id;

  // Vérifier si le vote est terminé
  const now = new Date();
  const isDeadlinePassed = decision.endDate ? new Date(decision.endDate) <= now : false;

  // Pour les décisions PUBLIC_LINK, seule la deadline peut fermer automatiquement la décision
  // (le créateur doit fermer manuellement via la page /share)
  // Pour les décisions INVITED, la deadline OU tous les participants ayant voté peut fermer la décision
  let isVotingFinished = isDeadlinePassed;
  if (decision.votingMode === 'INVITED') {
    const allParticipantsVoted = decision.participants.every((p) => p.hasVoted);
    isVotingFinished = isDeadlinePassed || allParticipantsVoted;
  }

  // Mettre à jour le statut automatiquement si le vote est terminé
  if (decision.status === 'OPEN' && isVotingFinished) {
    await prisma.decision.update({
      where: { id: decision.id },
      data: { status: 'CLOSED' },
    });
    decision.status = 'CLOSED';

    // Logger la fermeture automatique avec la raison
    const reason = isDeadlinePassed ? 'deadline_reached' : 'all_voted';
    await logDecisionClosed(decision.id, session.user.id, reason);
  }

  // Vérifier si l'utilisateur peut voir les résultats
  // Pour CONSENSUS : accès libre à tout moment
  // Pour MAJORITY et NUANCED_VOTE : accès uniquement quand le vote est terminé
  const canSeeResults = decision.decisionType === 'CONSENSUS' || isVotingFinished;

  if (!canSeeResults) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Résultats non disponibles
          </h2>
          <p className="text-yellow-700">
            Les résultats du vote à la majorité ne sont visibles qu'une fois le vote terminé
            (date limite atteinte ou tous les participants ont voté).
          </p>
          <div className="mt-4">
            <a
              href={`/organizations/${slug}/decisions/${decisionId}/vote`}
              className="text-blue-600 hover:underline"
            >
              Retour à la page de vote
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Calculer les résultats pour le vote à la majorité
  let proposalResults: Array<{
    proposal: any;
    voteCount: number;
    percentage: number;
    isWinner: boolean;
  }> = [];

  if (decision.decisionType === 'MAJORITY') {
    const totalVotes = decision.proposals.reduce(
      (sum, p) => sum + p.proposalVotes.length,
      0
    );

    const maxVotes = Math.max(...decision.proposals.map((p) => p.proposalVotes.length));

    proposalResults = decision.proposals.map((proposal) => ({
      proposal,
      voteCount: proposal.proposalVotes.length,
      percentage: totalVotes > 0 ? (proposal.proposalVotes.length / totalVotes) * 100 : 0,
      isWinner: proposal.proposalVotes.length === maxVotes && maxVotes > 0,
    }));
  }

  // Calculer les résultats pour le consensus
  const agreeCount = decision.votes.filter((v) => v.value === 'AGREE').length;
  const disagreeCount = decision.votes.filter((v) => v.value === 'DISAGREE').length;
  const totalConsensusVotes = agreeCount + disagreeCount;
  const consensusReached = totalConsensusVotes > 0 && disagreeCount === 0;

  // Calculer les résultats pour le vote nuancé
  let nuancedResults: any[] = [];
  if (decision.decisionType === 'NUANCED_VOTE' && decision.nuancedProposals) {
    const proposalsWithMentions = decision.nuancedProposals.map(proposal => ({
      id: proposal.id,
      title: proposal.title,
      mentions: proposal.nuancedVotes.map(vote => vote.mention),
    }));

    nuancedResults = calculateNuancedVoteResults(
      proposalsWithMentions,
      decision.nuancedScale || '5_LEVELS'
    );
  }

  return (
    <ResultsPageClient
      decision={decision}
      proposalResults={proposalResults}
      nuancedResults={nuancedResults}
      agreeCount={agreeCount}
      disagreeCount={disagreeCount}
      consensusReached={consensusReached}
      slug={slug}
      isCreator={isCreator}
      votingMode={decision.votingMode}
    />
  );
}
