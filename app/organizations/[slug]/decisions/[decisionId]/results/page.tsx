import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ResultsPageClient from './ResultsPageClient';

export default async function ResultsPage({
  params,
}: {
  params: { slug: string; decisionId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { slug, decisionId } = params;

  // Récupérer la décision
  const decision = await prisma.decision.findFirst({
    where: {
      id: decisionId,
      organizationId: slug,
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

  // Vérifier si l'utilisateur peut voir les résultats
  const isOpen = decision.status === 'OPEN';
  const allParticipantsVoted = decision.participants.every((p) => p.hasVoted);
  const canSeeResults = isCreator || !isOpen || allParticipantsVoted;

  if (!canSeeResults && isOpen) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Résultats non disponibles
          </h2>
          <p className="text-yellow-700">
            Les résultats ne seront visibles que lorsque le vote sera terminé ou que tous les participants auront voté.
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

  return (
    <ResultsPageClient
      decision={decision}
      proposalResults={proposalResults}
      agreeCount={agreeCount}
      disagreeCount={disagreeCount}
      consensusReached={consensusReached}
      slug={slug}
      isCreator={isCreator}
    />
  );
}
