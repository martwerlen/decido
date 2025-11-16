import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SharePageClient from './SharePageClient';

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string; decisionId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { slug, decisionId } = await params;

  // Récupérer l'organisation
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!org || org.members.length === 0) {
    redirect('/');
  }

  // Récupérer la décision
  const decision = await prisma.decision.findUnique({
    where: {
      id: decisionId,
      organizationId: org.id,
    },
    include: {
      _count: {
        select: {
          anonymousVoteLogs: true,
        },
      },
    },
  });

  if (!decision) {
    redirect(`/${slug}`);
  }

  // Vérifier que l'utilisateur est le créateur
  if (decision.creatorId !== session.user.id) {
    redirect(`/${slug}/decisions/${decisionId}/vote`);
  }

  // Vérifier que c'est bien une décision PUBLIC_LINK
  if (decision.votingMode !== 'PUBLIC_LINK' || !decision.publicSlug) {
    redirect(`/${slug}/decisions/${decisionId}/admin`);
  }

  return (
    <SharePageClient
      decision={decision}
      organizationSlug={slug}
      voteCount={decision._count.anonymousVoteLogs}
    />
  );
}
