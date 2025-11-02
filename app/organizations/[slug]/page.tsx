import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { DecisionStatusLabels, DecisionTypeLabels } from '@/types/enums';

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
  });

  if (!membership) {
    redirect('/');
  }

  // Récupérer les décisions en cours où l'utilisateur est invité OU créateur (max 5)
  // Pour les décisions PUBLIC_LINK créées par l'utilisateur, on les inclut aussi
  const myActiveDecisions = await prisma.decision.findMany({
    where: {
      organizationId: organization.id,
      status: 'OPEN',
      OR: [
        {
          // Décisions où l'utilisateur est participant (INVITED mode)
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
        {
          // Décisions PUBLIC_LINK créées par l'utilisateur
          AND: [
            { creatorId: session.user.id },
            { votingMode: 'PUBLIC_LINK' },
          ],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
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

  // Récupérer les 10 dernières décisions closes
  // Inclure les décisions PUBLIC_LINK créées par l'utilisateur
  const closedDecisions = await prisma.decision.findMany({
    where: {
      organizationId: organization.id,
      status: {
        in: ['CLOSED', 'IMPLEMENTED', 'ARCHIVED'],
      },
      OR: [
        {
          // Décisions où l'utilisateur est participant
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
        {
          // Décisions PUBLIC_LINK créées par l'utilisateur
          AND: [
            { creatorId: session.user.id },
            { votingMode: 'PUBLIC_LINK' },
          ],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{organization.name}</h1>
        <p className="text-gray-600 mt-2">Actualités et décisions</p>
      </div>

      {/* Décisions nécessitant votre participation */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">
            Participation attendue
            {myActiveDecisions.length > 0 && (
              <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full">
                {myActiveDecisions.length}
              </span>
            )}
          </h2>
        </div>

        {myActiveDecisions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
            Aucune décision en attente de votre participation
          </div>
        ) : (
          <div className="grid gap-4">
            {myActiveDecisions.map((decision) => {
              const hasVoted = decision.participants[0]?.hasVoted || false;
              const isPublicLink = decision.votingMode === 'PUBLIC_LINK';
              const isCreator = decision.creator.id === session.user.id;

              // Pour PUBLIC_LINK, le créateur va vers /share, sinon vers /vote
              const decisionUrl = isPublicLink && isCreator
                ? `/organizations/${slug}/decisions/${decision.id}/share`
                : `/organizations/${slug}/decisions/${decision.id}/vote`;

              return (
                <div
                  key={decision.id}
                  className={`bg-white border-2 rounded-lg p-5 hover:shadow-md transition ${
                    !hasVoted && !isPublicLink ? 'border-orange-300' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={decisionUrl}
                          className="text-lg font-semibold hover:text-blue-600"
                        >
                          {decision.title}
                        </Link>
                        {isPublicLink && isCreator && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                            Vote anonyme
                          </span>
                        )}
                        {!isPublicLink && !hasVoted && (
                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium">
                            Action requise
                          </span>
                        )}
                        {!isPublicLink && hasVoted && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                            ✓ Vous avez participé
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-3">{decision.description}</p>

                      <div className="flex gap-3 text-sm text-gray-500">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
                        </span>
                        {decision.team && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {decision.team.name}
                          </span>
                        )}
                        {decision.endDate && (
                          <span className="text-gray-600">
                            Fin : {new Date(decision.endDate).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        {isPublicLink ? (
                          <span>{decision._count.votes} votes anonymes</span>
                        ) : (
                          <>
                            <span>{decision._count.participants} participants</span>
                            {decision.decisionType === 'CONSENSUS' && (
                              <span>{decision._count.comments} commentaires</span>
                            )}
                            {decision._count.votes > 0 && (
                              <span>{decision._count.votes} votes</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <Link
                      href={decisionUrl}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ml-4 ${
                        !hasVoted && !isPublicLink
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isPublicLink && isCreator ? 'Gérer' : (!hasVoted ? 'Participer' : 'Voir')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Décisions closes récentes */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Décisions terminées</h2>

        {closedDecisions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
            Aucune décision terminée pour le moment
          </div>
        ) : (
          <div className="grid gap-3">
            {closedDecisions.map((decision) => (
              <div
                key={decision.id}
                className="bg-white border rounded-lg p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/organizations/${slug}/decisions/${decision.id}/results`}
                      className="font-medium hover:text-blue-600"
                    >
                      {decision.title}
                    </Link>

                    <div className="flex gap-2 mt-2 text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {DecisionStatusLabels[decision.status as keyof typeof DecisionStatusLabels]}
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
                      </span>
                      {decision.result && (
                        <span
                          className={`px-2 py-1 rounded font-medium ${
                            decision.result === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {decision.result === 'APPROVED' ? 'Approuvée' : 'Rejetée'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-500 ml-4">
                    {decision.decidedAt && (
                      <span>
                        {new Date(decision.decidedAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
