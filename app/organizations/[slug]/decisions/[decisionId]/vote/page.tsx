import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import VotePageClient from './VotePageClient';

export default async function VotePage({
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

  // Récupérer la décision avec toutes les données nécessaires
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
          _count: {
            select: {
              proposalVotes: true,
            },
          },
        },
      },
      nuancedProposals: {
        orderBy: {
          order: 'asc',
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

  // Vérifier si l'utilisateur est autorisé à voter
  if (decision.votingMode === 'INVITED') {
    const participant = await prisma.decisionParticipant.findFirst({
      where: {
        decisionId,
        userId: session.user.id,
      },
    });

    if (!participant && decision.creatorId !== session.user.id) {
      redirect(`/organizations/${slug}/decisions/${decisionId}/results`);
    }
  }

  // Récupérer le vote de l'utilisateur
  let userVote = null;
  let userProposalVote = null;
  let userNuancedVotes = null;

  if (decision.decisionType === 'CONSENSUS') {
    userVote = await prisma.vote.findUnique({
      where: {
        userId_decisionId: {
          userId: session.user.id,
          decisionId,
        },
      },
    });
  } else if (decision.decisionType === 'MAJORITY') {
    userProposalVote = await prisma.proposalVote.findFirst({
      where: {
        userId: session.user.id,
        decisionId,
      },
      include: {
        proposal: true,
      },
    });
  } else if (decision.decisionType === 'NUANCED_VOTE') {
    userNuancedVotes = await prisma.nuancedVote.findMany({
      where: {
        userId: session.user.id,
        decisionId,
      },
      include: {
        proposal: true,
      },
    });
  }

  return (
    <VotePageClient
      decision={decision}
      userVote={userVote}
      userProposalVote={userProposalVote}
      userNuancedVotes={userNuancedVotes}
      slug={slug}
      userId={session.user.id}
      isCreator={decision.creatorId === session.user.id}
    />
  );
}
