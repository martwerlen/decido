import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function OrganizationDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { slug } = await params;

  // Récupérer l'organisation
  const organization = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!organization) {
    redirect('/');
  }

  // Vérifier que l'utilisateur est membre de l'organisation
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: organization.id,
      },
    },
    include: {
      teamMembers: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    redirect('/');
  }

  // Extraire les équipes de l'utilisateur
  const userTeams = membership.teamMembers.map((tm) => tm.team);

  // Récupérer les brouillons créés par l'utilisateur
  const draftDecisions = await prisma.decision.findMany({
    where: {
      organizationId: organization.id,
      status: 'DRAFT',
      creatorId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      proposal: true,
      initialProposal: true,
      decisionType: true,
      votingMode: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Récupérer les décisions en cours où l'utilisateur est invité (mode INVITED uniquement)
  const myActiveDecisions = await prisma.decision.findMany({
    where: {
      organizationId: organization.id,
      status: 'OPEN',
      votingMode: 'INVITED',
      participants: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      proposal: true,
      initialProposal: true,
      decisionType: true,
      status: true,
      votingMode: true,
      endDate: true,
      createdAt: true,
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
      participants: {
        where: {
          userId: session.user.id,
        },
        select: {
          hasVoted: true,
        },
      },
      _count: {
        select: {
          participants: true,
          votes: true,
          comments: true,
        },
      },
    },
    orderBy: {
      endDate: 'asc',
    },
    take: 5,
  });

  // Récupérer les décisions PUBLIC_LINK en cours créées par l'utilisateur
  const publicLinkDecisions = await prisma.decision.findMany({
    where: {
      organizationId: organization.id,
      status: 'OPEN',
      votingMode: 'PUBLIC_LINK',
      creatorId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      proposal: true,
      initialProposal: true,
      decisionType: true,
      status: true,
      votingMode: true,
      publicSlug: true,
      endDate: true,
      createdAt: true,
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
      _count: {
        select: {
          votes: true,
          anonymousVoteLogs: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  // Récupérer les 10 dernières décisions closes (visibles pour tous les membres de l'organisation)
  const closedDecisions = await prisma.decision.findMany({
    where: {
      organizationId: organization.id,
      status: {
        in: ['CLOSED', 'IMPLEMENTED', 'ARCHIVED', 'WITHDRAWN'],
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      proposal: true,
      initialProposal: true,
      decisionType: true,
      status: true,
      votingMode: true,
      result: true,
      decidedAt: true,
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
      _count: {
        select: {
          participants: true,
          votes: true,
        },
      },
    },
    orderBy: {
      decidedAt: 'desc',
    },
    take: 10,
  });

  return (
    <DashboardContent
      slug={slug}
      organization={organization}
      userTeams={userTeams}
      userId={session.user.id}
      draftDecisions={draftDecisions}
      myActiveDecisions={myActiveDecisions}
      publicLinkDecisions={publicLinkDecisions}
      closedDecisions={closedDecisions}
    />
  );
}
