'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DecisionFilters, { DecisionFiltersType } from './DecisionFilters';
import DraftCard from './DraftCard';
import UserAvatar from '@/components/common/UserAvatar';
import { DecisionStatusLabels, DecisionTypeLabels } from '@/types/enums';

interface Team {
  id: string;
  name: string;
}

interface DashboardContentProps {
  slug: string;
  organization: { name: string };
  userTeams: Team[];
  userId: string;
  draftDecisions: any[];
  myActiveDecisions: any[];
  publicLinkDecisions: any[];
  closedDecisions: any[];
}

export default function DashboardContent({
  slug,
  organization,
  userTeams,
  userId,
  draftDecisions,
  myActiveDecisions,
  publicLinkDecisions,
  closedDecisions,
}: DashboardContentProps) {
  const [filters, setFilters] = useState<DecisionFiltersType>({
    statusFilter: ['OPEN'], // Par défaut : En cours uniquement
    scopeFilter: 'ALL', // Par défaut : Toute l'organisation
    typeFilter: ['ADVICE_SOLICITATION', 'CONSENSUS', 'MAJORITY', 'NUANCED_VOTE'], // Par défaut : tous
  });

  // Combiner toutes les décisions avec leurs métadonnées
  const allDecisions = useMemo(() => {
    const decisions = [];

    // Ajouter les brouillons
    for (const decision of draftDecisions) {
      decisions.push({
        ...decision,
        status: 'DRAFT',
        _meta: { category: 'draft' },
      });
    }

    // Ajouter les décisions INVITED en cours
    for (const decision of myActiveDecisions) {
      decisions.push({
        ...decision,
        status: 'OPEN',
        _meta: { category: 'active' },
      });
    }

    // Ajouter les décisions PUBLIC_LINK en cours
    for (const decision of publicLinkDecisions) {
      decisions.push({
        ...decision,
        status: 'OPEN',
        _meta: { category: 'publicLink' },
      });
    }

    // Ajouter les décisions terminées
    for (const decision of closedDecisions) {
      decisions.push({
        ...decision,
        _meta: { category: 'closed' },
      });
    }

    return decisions;
  }, [draftDecisions, myActiveDecisions, publicLinkDecisions, closedDecisions]);

  // Filtrer les décisions en fonction des filtres
  const filteredDecisions = useMemo(() => {
    return allDecisions.filter((decision) => {
      // Filtre 1: Statut
      const statusMatches = filters.statusFilter.includes(decision.status);
      if (!statusMatches) return false;

      // Filtre 2: Périmètre
      if (filters.scopeFilter !== 'ALL') {
        if (filters.scopeFilter === 'ME') {
          // Montrer seulement les décisions créées par l'utilisateur
          if (decision.creator?.id !== userId && decision.creatorId !== userId) {
            return false;
          }
        } else {
          // Filtrer par équipe
          if (!decision.team || decision.team.id !== filters.scopeFilter) {
            return false;
          }
        }
      }

      // Filtre 3: Type
      const typeMatches = filters.typeFilter.includes(decision.decisionType);
      if (!typeMatches) return false;

      return true;
    });
  }, [allDecisions, filters, userId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{organization.name}</h1>
        <p className="text-gray-600 mt-2">Actualités et décisions</p>
      </div>

      {/* Filtres */}
      <DecisionFilters userTeams={userTeams} onFilterChange={setFilters} />

      {/* Décisions filtrées */}
      <section className="mb-8">
        {filteredDecisions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
            Aucune décision ne correspond aux filtres sélectionnés
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredDecisions.map((decision) => {
              // Décisions brouillons : utiliser DraftCard
              if (decision._meta.category === 'draft') {
                return <DraftCard key={decision.id} draft={decision} orgSlug={slug} />;
              }

              // Pour toutes les autres décisions : afficher une card compacte
              const hasVoted = decision.participants?.[0]?.hasVoted || false;
              const isPublicLink = decision._meta.category === 'publicLink';
              const isClosed = decision._meta.category === 'closed';

              // Déterminer l'URL de destination
              let targetUrl = '';
              if (isPublicLink) {
                targetUrl = `/organizations/${slug}/decisions/${decision.id}/share`;
              } else if (isClosed) {
                targetUrl = `/organizations/${slug}/decisions/${decision.id}/results`;
              } else {
                targetUrl = `/organizations/${slug}/decisions/${decision.id}/vote`;
              }

              return (
                <div
                  key={decision.id}
                  className={`bg-white border rounded-lg p-3 hover:shadow-sm transition ${
                    !hasVoted && !isClosed && !isPublicLink ? 'border-orange-300' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={targetUrl}
                          className="text-sm font-semibold hover:text-blue-600 truncate"
                        >
                          {decision.title}
                        </Link>
                        {!hasVoted && !isClosed && !isPublicLink && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={{ backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}>
                            Action requise
                          </span>
                        )}
                        {hasVoted && !isClosed && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
                            ✓ Participé
                          </span>
                        )}
                        {isPublicLink && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                            Vote anonyme
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 text-xs text-gray-500 flex-wrap">
                        <span className="px-2 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: 'var(--color-primary-lighter)', color: 'var(--color-primary-dark)' }}>
                          {DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
                        </span>
                        {decision.team && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded whitespace-nowrap">
                            {decision.team.name}
                          </span>
                        )}
                        {isClosed && decision.result && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: decision.result === 'APPROVED' ? 'var(--color-success)' : 'var(--color-error)',
                              color: 'white'
                            }}
                          >
                            {decision.result === 'APPROVED' ? 'Approuvée' : decision.result === 'WITHDRAWN' ? 'Retirée' : 'Rejetée'}
                          </span>
                        )}
                        {decision.endDate && !isClosed && (
                          <span className="text-gray-600 whitespace-nowrap">
                            Fin : {new Date(decision.endDate).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        {isClosed && decision.decidedAt && (
                          <span className="text-gray-600 whitespace-nowrap">
                            {new Date(decision.decidedAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={targetUrl}
                      className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
                        !hasVoted && !isClosed && !isPublicLink
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : isPublicLink
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {!hasVoted && !isClosed && !isPublicLink ? 'Participer' : isPublicLink ? 'Gérer' : 'Voir'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
