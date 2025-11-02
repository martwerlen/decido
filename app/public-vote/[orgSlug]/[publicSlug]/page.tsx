import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PublicVotePageClient from './PublicVotePageClient';

export default async function PublicVotePage({
  params,
}: {
  params: Promise<{ orgSlug: string; publicSlug: string }>;
}) {
  const { orgSlug, publicSlug } = await params;

  // Récupérer l'organisation
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    notFound();
  }

  // Récupérer la décision par publicSlug
  const decision = await prisma.decision.findFirst({
    where: {
      organizationId: org.id,
      publicSlug: publicSlug,
      votingMode: 'PUBLIC_LINK',
    },
    include: {
      proposals: {
        orderBy: { order: 'asc' },
      },
      nuancedProposals: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!decision) {
    notFound();
  }

  // Vérifier que la décision est ouverte
  if (decision.status === 'DRAFT') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Vote non encore ouvert</h1>
          <p className="text-gray-600">
            Cette décision n'est pas encore ouverte au vote. Veuillez réessayer plus tard.
          </p>
        </div>
      </div>
    );
  }

  if (decision.status === 'CLOSED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Vote terminé</h1>
          <p className="text-gray-600">
            Cette décision est maintenant fermée et n'accepte plus de votes.
          </p>
        </div>
      </div>
    );
  }

  // Vérifier si la deadline est dépassée
  if (decision.endDate && new Date(decision.endDate) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Vote expiré</h1>
          <p className="text-gray-600">
            La date limite pour voter sur cette décision est dépassée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PublicVotePageClient
      decision={{
        id: decision.id,
        title: decision.title,
        description: decision.description,
        decisionType: decision.decisionType,
        endDate: decision.endDate ? decision.endDate.toISOString() : null,
        initialProposal: decision.initialProposal,
        proposal: decision.proposal,
        nuancedScale: decision.nuancedScale,
        proposals: decision.proposals,
        nuancedProposals: decision.nuancedProposals,
      }}
      orgSlug={orgSlug}
      publicSlug={publicSlug}
    />
  );
}
