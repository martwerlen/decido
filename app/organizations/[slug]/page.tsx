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

  // Filtres par défaut : décisions EN COURS uniquement
  const defaultStatusFilter = ['OPEN'];
  const defaultTypeFilter = ['ADVICE_SOLICITATION', 'CONSENSUS', 'MAJORITY', 'NUANCED_VOTE'];

  // Construire le filtre where (même logique que l'API)
  const where: any = {
    organizationId: organization.id,
    status: { in: defaultStatusFilter },
    decisionType: { in: defaultTypeFilter },
  };

  // Charger les 20 premières décisions avec filtres par défaut
  const initialDecisions = await prisma.decision.findMany({
    where,
    select: {
      // Champs scalaires de Decision
      id: true,
      title: true,
      description: true,
      proposal: true,
      initialProposal: true,
      context: true,
      decisionType: true,
      status: true,
      result: true,
      votingMode: true,
      publicSlug: true,
      endDate: true,
      startDate: true,
      decidedAt: true,
      createdAt: true,
      updatedAt: true,
      creatorId: true,
      // Relations
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

  // Compter le nombre total de décisions avec les filtres
  const totalCount = await prisma.decision.count({ where });

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
