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

  // Récupérer la décision avec toutes les données nécessaires (optimisé)
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
          image: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      proposals: {
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
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
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
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
          externalParticipant: {
            select: {
              id: true,
              externalName: true,
              externalEmail: true,
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
              externalParticipant: {
                select: {
                  id: true,
                  externalName: true,
                  externalEmail: true,
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
        select: {
          id: true,
          userId: true,
          teamId: true,
          externalName: true,
          externalEmail: true,
          hasVoted: true,
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

  // Récupérer les équipes de l'organisation avec leurs membres
  const organizationTeams = await prisma.team.findMany({
    where: {
      organizationId: organization.id,
    },
    include: {
      members: {
        include: {
          organizationMember: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  // Vérifier si l'utilisateur est autorisé à accéder à la page de vote
  if (decision.votingMode === 'INVITED') {
    // Pour ADVICE_SOLICITATION et CONSENT, tous les membres de l'organisation peuvent accéder
    // Pour ADVICE_SOLICITATION: pour commenter, seuls les participants peuvent donner leur avis
    // Pour CONSENT: tous peuvent voir, seuls les participants peuvent participer
    if (decision.decisionType !== 'ADVICE_SOLICITATION' && decision.decisionType !== 'CONSENT') {
      // Pour les autres types de décisions, seuls les participants peuvent voter
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
  }

  // Récupérer le vote de l'utilisateur
  let userVote = null;
  let userProposalVote = null;
  let userNuancedVotes = null;
  let userOpinion = null;
  let allOpinions = null;
  let clarificationQuestions = null;
  let userObjection = null;
  let allObjections = null;

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
  } else if (decision.decisionType === 'ADVICE_SOLICITATION') {
    // Récupérer l'avis de l'utilisateur
    userOpinion = await prisma.opinionResponse.findFirst({
      where: {
        userId: session.user.id,
        decisionId,
      },
    });

    // Récupérer tous les avis
    allOpinions = await prisma.opinionResponse.findMany({
      where: {
        decisionId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        externalParticipant: {
          select: {
            id: true,
            externalName: true,
            externalEmail: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  } else if (decision.decisionType === 'CONSENT') {
    // Récupérer toutes les questions de clarification
    clarificationQuestions = await prisma.clarificationQuestion.findMany({
      where: {
        decisionId,
      },
      include: {
        questioner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        externalQuestioner: {
          select: {
            id: true,
            externalName: true,
            externalEmail: true,
          },
        },
        answerer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Récupérer l'objection de l'utilisateur
    userObjection = await prisma.consentObjection.findFirst({
      where: {
        userId: session.user.id,
        decisionId,
      },
    });

    // Récupérer toutes les objections
    allObjections = await prisma.consentObjection.findMany({
      where: {
        decisionId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        externalParticipant: {
          select: {
            id: true,
            externalName: true,
            externalEmail: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  return (
    <VotePageClient
      decision={decision}
      userVote={userVote}
      userProposalVote={userProposalVote}
      userNuancedVotes={userNuancedVotes}
      userOpinion={userOpinion}
      allOpinions={allOpinions}
      clarificationQuestions={clarificationQuestions}
      userObjection={userObjection}
      allObjections={allObjections}
      organizationTeams={organizationTeams}
      slug={slug}
      userId={session.user.id}
      isCreator={decision.creatorId === session.user.id}
    />
  );
}
