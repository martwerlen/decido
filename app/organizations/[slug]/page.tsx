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

  // Charger les 20 premières décisions avec pagination
  const initialDecisions = await prisma.decision.findMany({
    where: {
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
      participants: {
        select: {
          userId: true,
          hasVoted: true,
          teamId: true,
        },
      },
      _count: {
        select: {
          votes: true,
          comments: true,
          proposals: true,
          participants: true,
          anonymousVoteLogs: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  // Compter le nombre total de décisions
  const totalCount = await prisma.decision.count({
    where: {
      organizationId: organization.id,
    },
  });

  return (
    <DashboardContent
      slug={slug}
      organization={organization}
      userTeams={userTeams}
      userId={session.user.id}
      initialDecisions={initialDecisions}
      totalCount={totalCount}
    />
  );
}
