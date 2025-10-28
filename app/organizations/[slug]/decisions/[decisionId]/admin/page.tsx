import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DecisionAdminClient from './DecisionAdminClient';

export default async function DecisionAdminPage({
  params,
}: {
  params: Promise<{ slug: string; decisionId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { slug } = await params;

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
          _count: {
            select: {
              proposalVotes: true,
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

  // Vérifier que l'utilisateur est le créateur
  if (decision.creatorId !== session.user.id) {
    redirect(`/organizations/${slug}/decisions/${decisionId}/vote`);
  }

  // Récupérer les équipes de l'organisation
  const teams = await prisma.team.findMany({
    where: {
      organizationId: slug,
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  // Récupérer les membres de l'organisation
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: slug,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <DecisionAdminClient
      decision={decision}
      teams={teams}
      members={members}
      slug={slug}
      userId={session.user.id}
    />
  );
}
