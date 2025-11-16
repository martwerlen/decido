'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { TextField, Button, Box, Chip, Typography } from '@mui/material';
import { Add, Search, QrCode2 } from '@mui/icons-material';
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
  initialDecisions: any[];
  totalCount: number;
}

export default function DashboardContent({
  slug,
  organization,
  userTeams,
  userId,
  initialDecisions,
  totalCount,
}: DashboardContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Initialiser les filtres en fonction des query params de l'URL
  const getInitialStatusFilter = () => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'DRAFT') return ['DRAFT'];
    if (statusParam === 'CLOSED') return ['CLOSED'];
    if (statusParam === 'OPEN') return ['OPEN'];
    return ['OPEN']; // Par défaut : En cours uniquement
  };

  const [filters, setFilters] = useState<DecisionFiltersType>({
    statusFilter: getInitialStatusFilter(),
    scopeFilter: 'ALL', // Par défaut : Toute l'organisation
    typeFilter: ['ADVICE_SOLICITATION', 'CONSENSUS', 'CONSENT', 'MAJORITY', 'NUANCED_VOTE'], // Par défaut : tous
  });
  const [decisions, setDecisions] = useState(initialDecisions);
  const [total, setTotal] = useState(totalCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Combiner toutes les décisions avec leurs métadonnées (pour l'affichage)
  const decisionsWithMeta = useMemo(() => {
    return decisions.map((decision) => {
      // Déterminer la catégorie de la décision
      let category = 'closed';
      if (decision.status === 'DRAFT') {
        category = 'draft';
      } else if (decision.status === 'OPEN') {
        if (decision.votingMode === 'PUBLIC_LINK') {
          category = 'publicLink';
        } else {
          category = 'active';
        }
      }

      return {
        ...decision,
        _meta: { category },
      };
    });
  }, [decisions]);

  // Construire les paramètres de requête pour l'API
  const buildQueryParams = (skip: number) => {
    const params = new URLSearchParams();
    params.set('skip', skip.toString());
    params.set('take', '20');
    if (filters.statusFilter.length > 0) {
      params.set('status', filters.statusFilter.join(','));
    }
    if (filters.scopeFilter !== 'ALL') {
      params.set('scope', filters.scopeFilter);
    }
    if (filters.typeFilter.length > 0) {
      params.set('type', filters.typeFilter.join(','));
    }
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }
    return params.toString();
  };

  // Recharger les décisions depuis le début quand les filtres changent
  const reloadDecisions = async () => {
    setIsReloading(true);
    try {
      const response = await fetch(
        `/api/${slug}/decisions?${buildQueryParams(0)}`
      );
      const data = await response.json();
      if (data.decisions) {
        setDecisions(data.decisions);
        setTotal(data.totalCount || 0);
      }
    } catch (error) {
      console.error('Error reloading decisions:', error);
    } finally {
      setIsReloading(false);
    }
  };

  // Écouter les changements de filtres et de recherche
  useEffect(() => {
    reloadDecisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchQuery]);

  // Fonction pour charger plus de décisions
  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/${slug}/decisions?${buildQueryParams(decisions.length)}`
      );
      const data = await response.json();
      if (data.decisions) {
        setDecisions([...decisions, ...data.decisions]);
      }
    } catch (error) {
      console.error('Error loading more decisions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

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
            onClick={() => router.push(`/${slug}/decisions/new`)}
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
      <DecisionFilters userTeams={userTeams} filters={filters} onFilterChange={setFilters} />

      {/* Décisions filtrées */}
      <section className="mb-8">
        {isReloading ? (
          <Box sx={{ backgroundColor: 'background.secondary', borderRadius: 2, p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Chargement...
          </Box>
        ) : decisionsWithMeta.length === 0 ? (
          <Box sx={{ backgroundColor: 'background.secondary', borderRadius: 2, p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Aucune décision ne correspond aux filtres sélectionnés
          </Box>
        ) : (
          <div className="grid gap-2">
            {decisionsWithMeta.map((decision) => {
              // Décisions brouillons : utiliser DraftCard
              if (decision._meta.category === 'draft') {
                return <DraftCard key={decision.id} draft={decision} orgSlug={slug} />;
              }

              // Pour toutes les autres décisions : afficher une card compacte
              const userParticipant = decision.participants?.find((p: any) => p.userId === userId);

              // Déterminer hasVoted selon le type de décision
              let hasVoted = false;
              if (decision.decisionType === 'CONSENT') {
                // Pour les décisions CONSENT, déterminer hasVoted selon le stade actuel
                const currentStage = decision.consentCurrentStage;

                if (currentStage === 'CLARIFICATIONS') {
                  // Stade questions : a-t-il posé au moins une question ?
                  hasVoted = decision.clarificationQuestions?.length > 0;
                } else if (currentStage === 'CLARIFAVIS') {
                  // Stade clarifavis : a-t-il posé une question OU donné son avis ?
                  hasVoted = (decision.clarificationQuestions?.length > 0) || (decision.opinionResponses?.length > 0);
                } else if (currentStage === 'AVIS') {
                  // Stade avis : a-t-il donné son avis ?
                  hasVoted = decision.opinionResponses?.length > 0;
                } else if (currentStage === 'OBJECTIONS') {
                  // Stade objections : a-t-il enregistré sa position ?
                  hasVoted = decision.consentObjections?.length > 0;
                } else {
                  // Pour les autres stades (AMENDEMENTS, TERMINEE)
                  hasVoted = userParticipant?.hasVoted || false;
                }
              } else {
                // Pour les autres types de décisions, utiliser hasVoted standard
                hasVoted = userParticipant?.hasVoted || false;
              }

              const isPublicLink = decision._meta.category === 'publicLink';
              const isClosed = decision._meta.category === 'closed';

              // Déterminer l'URL de destination
              let targetUrl = '';
              if (isPublicLink) {
                targetUrl = `/${slug}/decisions/${decision.id}/share`;
              } else if (isClosed) {
                targetUrl = `/${slug}/decisions/${decision.id}/results`;
              } else {
                targetUrl = `/${slug}/decisions/${decision.id}/vote`;
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
                        {decision.votingMode === 'PUBLIC_LINK' && (
                          <QrCode2 sx={{ fontSize: '1.25rem', color: 'action.active' }} />
                        )}
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
                        {isPublicLink && !isClosed && (
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
                        {!isClosed && decision.decisionType === 'CONSENT' && decision.consentCurrentStage && (
                          <Chip
                            label={
                              decision.consentCurrentStage === 'CLARIFICATIONS' ? 'Questions' :
                              decision.consentCurrentStage === 'CLARIFAVIS' ? 'Questions & Avis' :
                              decision.consentCurrentStage === 'AVIS' ? 'Avis' :
                              decision.consentCurrentStage === 'AMENDEMENTS' ? 'Amendements' :
                              decision.consentCurrentStage === 'OBJECTIONS' ? 'Objections' :
                              decision.consentCurrentStage
                            }
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
                          />
                        )}
                        {isClosed && decision.result && (
                          <Chip
                            label={
                              decision.result === 'APPROVED'
                                ? decision.decisionType === 'MAJORITY' || decision.decisionType === 'NUANCED_VOTE'
                                  ? 'Décision prise'
                                  : 'Approuvée'
                                : decision.result === 'WITHDRAWN'
                                ? 'Retirée'
                                : 'Rejetée'
                            }
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

        {/* Bouton "Charger 20 de plus" */}
        {!isReloading && decisionsWithMeta.length > 0 && decisions.length < total && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button
              onClick={loadMore}
              disabled={isLoadingMore}
              variant="outlined"
              color="primary"
              size="large"
            >
              {isLoadingMore ? 'Chargement...' : `Charger 20 décisions de plus (${decisions.length}/${total})`}
            </Button>
          </Box>
        )}
      </section>
    </div>
  );
}
