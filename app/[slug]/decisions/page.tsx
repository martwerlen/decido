import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { DecisionStatusLabels, DecisionTypeLabels } from '@/types/enums';

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { slug } = await params;

  // Vérifier que l'utilisateur est membre de l'organisation
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: slug,
      },
    },
  });

  if (!membership) {
    redirect('/');
  }

  // Récupérer l'organisation
  const organization = await prisma.organization.findUnique({
    where: { id: slug },
  });

  if (!organization) {
    redirect('/');
  }

  // Récupérer les décisions
  const decisions = await prisma.decision.findMany({
    where: {
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
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          votes: true,
          comments: true,
          proposals: true,
          participants: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="text-gray-600 mt-2">Décisions</p>
        </div>
        <Link
          href={`/${slug}/decisions/new`}
          className="text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--color-primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
        >
          Nouvelle décision
        </Link>
      </div>

      {decisions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">Aucune décision pour le moment</p>
          <Link
            href={`/${slug}/decisions/new`}
            className="text-blue-600 hover:underline"
          >
            Créer la première décision
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="bg-white border rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link
                    href={`/${slug}/decisions/${decision.id}/vote`}
                    className="text-xl font-semibold hover:text-blue-600"
                  >
                    {decision.title}
                  </Link>
                  <p className="text-gray-600 mt-2">{decision.description}</p>

                  <div className="flex gap-4 mt-4 text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {DecisionStatusLabels[decision.status as keyof typeof DecisionStatusLabels]}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
                    </span>
                    {decision.team && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {decision.team.name}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>{decision._count.participants} participants</span>
                    {decision.decisionType === 'MAJORITY' && (
                      <span>{decision._count.proposals} propositions</span>
                    )}
                    {decision.decisionType === 'CONSENSUS' && (
                      <span>{decision._count.comments} commentaires</span>
                    )}
                    {decision.endDate && (
                      <span>
                        Fin : {new Date(decision.endDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {decision.creatorId === session.user.id && (
                    <Link
                      href={`/${slug}/decisions/${decision.id}/admin`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Administrer
                    </Link>
                  )}
                  <Link
                    href={`/${slug}/decisions/${decision.id}/results`}
                    className="text-gray-600 hover:underline text-sm"
                  >
                    Résultats
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
