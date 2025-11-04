'use client';

import { useState } from 'react';
import Link from 'next/link';
import DecisionFilters from './DecisionFilters';
import DraftCard from './DraftCard';
import UserAvatar from '@/components/common/UserAvatar';
import { DecisionStatusLabels, DecisionTypeLabels } from '@/types/enums';

interface DashboardContentProps {
  slug: string;
  organization: { name: string };
  draftDecisions: any[];
  myActiveDecisions: any[];
  publicLinkDecisions: any[];
  closedDecisions: any[];
}

export default function DashboardContent({
  slug,
  organization,
  draftDecisions,
  myActiveDecisions,
  publicLinkDecisions,
  closedDecisions,
}: DashboardContentProps) {
  const [filters, setFilters] = useState({
    showDrafts: false,
    showActive: true, // Par défaut : En cours uniquement
    showClosed: false,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{organization.name}</h1>
        <p className="text-gray-600 mt-2">Actualités et décisions</p>
      </div>

      {/* Filtres */}
      <DecisionFilters onFilterChange={setFilters} />

      {/* Brouillons */}
      {filters.showDrafts && draftDecisions.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">
              Brouillons
              <span className="ml-2 text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                {draftDecisions.length}
              </span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Décisions en cours de création que vous pourrez finaliser et lancer
            </p>
          </div>

          <div className="grid gap-3">
            {draftDecisions.map((draft) => (
              <DraftCard key={draft.id} draft={draft} orgSlug={slug} />
            ))}
          </div>
        </section>
      )}

      {/* Décisions en cours */}
      {filters.showActive && (
        <>
          {/* Décisions INVITED en cours */}
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold">
                En cours
                {myActiveDecisions.length > 0 && (
                  <span className="ml-2 text-sm px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
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

                  return (
                    <div
                      key={decision.id}
                      className={`bg-white border-2 rounded-lg p-5 hover:shadow-md transition ${
                        !hasVoted ? 'border-orange-300' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Link
                              href={`/organizations/${slug}/decisions/${decision.id}/vote`}
                              className="text-lg font-semibold hover:text-blue-600"
                            >
                              {decision.title}
                            </Link>
                            {!hasVoted && (
                              <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}>
                                Action requise
                              </span>
                            )}
                            {hasVoted && (
                              <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
                                ✓ Vous avez participé
                              </span>
                            )}
                          </div>

                          <p className="text-gray-600 text-sm mb-3">{decision.description}</p>

                          <div className="flex gap-3 text-sm text-gray-500">
                            <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-primary-lighter)', color: 'var(--color-primary-dark)' }}>
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
                            <span>{decision._count.participants} participants</span>
                            {decision.decisionType === 'CONSENSUS' && (
                              <span>{decision._count.comments} commentaires</span>
                            )}
                            {decision._count.votes > 0 && (
                              <span>{decision._count.votes} votes</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>Créée par</span>
                            <UserAvatar user={decision.creator} size="small" />
                            <span>{decision.creator.name}</span>
                          </div>
                        </div>

                        <Link
                          href={`/organizations/${slug}/decisions/${decision.id}/vote`}
                          className={`px-4 py-2 rounded-lg font-medium text-sm ml-4 ${
                            !hasVoted
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {!hasVoted ? 'Participer' : 'Voir'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Décisions PUBLIC_LINK en cours */}
          {publicLinkDecisions.length > 0 && (
            <section className="mb-8">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold">
                  Décisions en cours via URL anonyme
                  <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {publicLinkDecisions.length}
                  </span>
                </h2>
              </div>

              <div className="grid gap-4">
                {publicLinkDecisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="bg-white border-2 border-purple-200 rounded-lg p-5 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            href={`/organizations/${slug}/decisions/${decision.id}/share`}
                            className="text-lg font-semibold hover:text-blue-600"
                          >
                            {decision.title}
                          </Link>
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                            Vote anonyme
                          </span>
                        </div>

                        <p className="text-gray-600 text-sm mb-3">{decision.description}</p>

                        <div className="flex gap-3 text-sm text-gray-500">
                          <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-primary-lighter)', color: 'var(--color-primary-dark)' }}>
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
                          <span>{decision._count.anonymousVoteLogs} votes anonymes</span>
                          <span className="text-purple-600">
                            URL : /public-vote/{slug}/{decision.publicSlug}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>Créée par</span>
                          <UserAvatar user={decision.creator} size="small" />
                          <span>{decision.creator.name}</span>
                        </div>
                      </div>

                      <Link
                        href={`/organizations/${slug}/decisions/${decision.id}/share`}
                        className="px-4 py-2 rounded-lg font-medium text-sm ml-4 bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Gérer
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Décisions terminées */}
      {filters.showClosed && (
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
                        <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                          {DecisionStatusLabels[decision.status as keyof typeof DecisionStatusLabels]}
                        </span>
                        <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-primary-lighter)', color: 'var(--color-primary-dark)' }}>
                          {DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
                        </span>
                        {decision.result && (
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: decision.result === 'APPROVED' ? 'var(--color-success)' : 'var(--color-error)',
                              color: 'white'
                            }}
                          >
                            {decision.result === 'APPROVED' ? 'Approuvée' : 'Rejetée'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>Créée par</span>
                        <UserAvatar user={decision.creator} size="small" />
                        <span>{decision.creator.name}</span>
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
      )}
    </div>
  );
}
