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

  // Si décision PUBLIC_LINK, rediriger vers la page de partage (pas de gestion post-lancement)
  if (decision.votingMode === 'PUBLIC_LINK') {
    redirect(`/organizations/${slug}/decisions/${decisionId}/share`);
  }

  return (
    <DecisionAdminClient
      decision={decision}
      slug={slug}
      userId={session.user.id}
    />
  );
}
