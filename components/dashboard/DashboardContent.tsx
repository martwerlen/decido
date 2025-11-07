'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TextField, Button, Box, Chip, Typography } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filtrer les décisions en fonction des filtres et de la recherche
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

      // Filtre 4: Recherche (titre, description, proposition)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = decision.title?.toLowerCase().includes(query);
        const descriptionMatch = decision.description?.toLowerCase().includes(query);
        const proposalMatch = decision.proposal?.toLowerCase().includes(query);
        const initialProposalMatch = decision.initialProposal?.toLowerCase().includes(query);

        if (!titleMatch && !descriptionMatch && !proposalMatch && !initialProposalMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allDecisions, filters, userId, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête avec titre, recherche et bouton */}
      <Box sx={{ mb: 4 }}>
        {/* Titre */}
        <h1 className="text-3xl font-bold mb-4">Décisions - {organization.name}</h1>

        {/* Barre de recherche + Bouton Nouvelle décision */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'flex-end',
          }}
        >
          <TextField
            size="small"
            placeholder="Rechercher une décision..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
            }}
            sx={{
              flex: { xs: '1 1 auto', sm: '0 1 300px' },
              backgroundColor: 'background.paper',
            }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push(`/organizations/${slug}/decisions/new`)}
            sx={{
              whiteSpace: 'nowrap',
              px: 3,
            }}
          >
            Nouvelle décision
          </Button>
        </Box>
      </Box>

      {/* Filtres */}
      <DecisionFilters userTeams={userTeams} onFilterChange={setFilters} />

      {/* Décisions filtrées */}
      <section className="mb-8">
        {filteredDecisions.length === 0 ? (
          <Box sx={{ backgroundColor: 'background.secondary', borderRadius: 2, p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Aucune décision ne correspond aux filtres sélectionnés
          </Box>
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
                <Box
                  key={decision.id}
                  sx={{
                    backgroundColor: 'background.paper',
                    border: 1,
                    borderColor: !hasVoted && !isClosed && !isPublicLink ? 'warning.main' : 'divider',
                    borderRadius: 2,
                    p: 1.5,
                    transition: 'box-shadow 0.2s',
                    '&:hover': {
                      boxShadow: 1,
                    },
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <Link
                          href={targetUrl}
                          className="text-sm font-semibold truncate"
                          style={{ color: 'inherit', textDecoration: 'none' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                        >
                          {decision.title}
                        </Link>
                        {!hasVoted && !isClosed && !isPublicLink && (
                          <Chip
                            label="Action requise"
                            size="small"
                            color="warning"
                            sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
                          />
                        )}
                        {hasVoted && !isClosed && (
                          <Chip
                            label="✓ Participé"
                            size="small"
                            color="success"
                            sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
                          />
                        )}
                        {isPublicLink && (
                          <Chip
                            label="Vote anonyme"
                            size="small"
                            color="secondary"
                            sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
                          />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, fontSize: '0.75rem', flexWrap: 'wrap', color: 'text.secondary' }}>
                        <Chip
                          label={DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
                        />
                        {decision.team && (
                          <Chip
                            label={decision.team.name}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
                          />
                        )}
                        {isClosed && decision.result && (
                          <Chip
                            label={decision.result === 'APPROVED' ? 'Approuvée' : decision.result === 'WITHDRAWN' ? 'Retirée' : 'Rejetée'}
                            size="small"
                            color={decision.result === 'APPROVED' ? 'success' : 'error'}
                            sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
                          />
                        )}
                        {decision.endDate && !isClosed && (
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', alignSelf: 'center' }}>
                            Fin : {new Date(decision.endDate).toLocaleDateString('fr-FR')}
                          </Typography>
                        )}
                        {isClosed && decision.decidedAt && (
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', alignSelf: 'center' }}>
                            {new Date(decision.decidedAt).toLocaleDateString('fr-FR')}
                          </Typography>
                        )}
                      </Box>
                    </div>

                    <Button
                      component={Link}
                      href={targetUrl}
                      variant={!hasVoted && !isClosed && !isPublicLink ? 'contained' : 'outlined'}
                      color={!hasVoted && !isClosed && !isPublicLink ? 'warning' : isPublicLink ? 'secondary' : 'inherit'}
                      size="small"
                      sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem', textDecoration: 'none' }}
                    >
                      {!hasVoted && !isClosed && !isPublicLink ? 'Participer' : isPublicLink ? 'Gérer' : 'Voir'}
                    </Button>
                  </div>
                </Box>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
