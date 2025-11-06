import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NewDecisionClient from './NewDecisionClient';

export default async function NewDecisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { slug } = await params;
  const { draft } = await searchParams;

  // Récupérer l'organisation par son slug
  const organization = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!organization) {
    redirect('/organizations');
  }

  // Vérifier que l'utilisateur est membre de l'organisation
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: organization.id,
      },
    },
  });

  if (!membership) {
    redirect('/organizations');
  }

  // Récupérer les équipes de l'organisation
  const teams = await prisma.team.findMany({
    where: {
      organizationId: organization.id,
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Récupérer les membres de l'organisation (exclure le créateur)
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: organization.id,
      userId: {
        not: session.user.id,
      },
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
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  });

  // Compter le nombre total de membres (pour validation ADVICE_SOLICITATION)
  const totalMemberCount = await prisma.organizationMember.count({
    where: {
      organizationId: organization.id,
    },
  });

  // Charger le brouillon si demandé
  let draftDecision = null;
  if (draft) {
    draftDecision = await prisma.decision.findFirst({
      where: {
        id: draft,
        organizationId: organization.id,
        creatorId: session.user.id,
        status: 'DRAFT',
      },
      include: {
        proposals: {
          orderBy: {
            order: 'asc',
          },
        },
        nuancedProposals: {
          orderBy: {
            order: 'asc',
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
  }

  return (
    <NewDecisionClient
      slug={slug}
      userId={session.user.id}
      teams={teams}
      members={members}
      totalMemberCount={totalMemberCount}
      draftDecision={draftDecision}
    />
  );
}
