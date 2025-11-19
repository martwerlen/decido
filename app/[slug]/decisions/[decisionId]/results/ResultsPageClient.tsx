'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Box, Chip, Typography, Alert, LinearProgress, Button } from '@mui/material';
import {
  DecisionStatusLabels,
  DecisionTypeLabels,
  DecisionResultLabels,
  getMentionLabel,
  getMentionColor,
  getMentionsForScale,
  NuancedScaleLabels,
} from '@/types/enums';
import HistoryButton from '@/components/decisions/HistoryButton';
import HistoryPanel from '@/components/decisions/HistoryPanel';

interface Proposal {
  id: string;
  title: string;
  description: string | null;
}

interface ProposalResult {
  proposal: Proposal;
  voteCount: number;
  percentage: number;
  isWinner: boolean;
}

interface NuancedProposalResult {
  proposalId: string;
  title: string;
  majorityMention: string;
  mentionProfile: Record<string, number>;
  rank: number;
  score: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface OpinionResponse {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  externalParticipant: {
    id: string;
    externalName: string | null;
    externalEmail: string | null;
  } | null;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  decisionType: string;
  status: string;
  result: string | null;
  resultDetails: string | null;
  initialProposal: string | null;
  proposal: string | null;
  conclusion: string | null;
  endDate: Date | null;
  decidedAt: Date | null;
  nuancedScale?: string | null;
  nuancedWinnerCount?: number | null;
  comments: Comment[];
  participants: any[];
}

interface Props {
  decision: Decision;
  proposalResults: ProposalResult[];
  nuancedResults: NuancedProposalResult[];
  agreeCount: number;
  disagreeCount: number;
  consensusReached: boolean;
  opinionResponses: OpinionResponse[];
  clarificationQuestions?: any[];
  consentObjections?: any[];
  slug: string;
  isCreator: boolean;
  votingMode: string;
}

export default function ResultsPageClient({
  decision,
  proposalResults,
  nuancedResults,
  agreeCount,
  disagreeCount,
  consensusReached,
  opinionResponses,
  clarificationQuestions = [],
  consentObjections = [],
  slug,
  isCreator,
  votingMode,
}: Props) {
  const totalVotes = proposalResults.reduce((sum, r) => sum + r.voteCount, 0);
  const totalConsensusVotes = agreeCount + disagreeCount;

  // Historique
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Bouton d'historique en haut à droite */}
      <div className="fixed top-4 right-4 z-50">
        <HistoryButton onClick={() => setHistoryOpen(true)} />
      </div>

      {/* Panneau d'historique */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        organizationSlug={slug}
        decisionId={decision.id}
      />

      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <h1 className="text-3xl font-bold">{decision.title}</h1>
        <Typography color="text.secondary" sx={{ mt: 1 }}>{decision.description}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip
            label={DecisionStatusLabels[decision.status as keyof typeof DecisionStatusLabels]}
            size="small"
            variant="outlined"
          />
          <Chip
            label={DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
            size="small"
            color="primary"
            variant="outlined"
          />
          {decision.result && (
            <Chip
              label={DecisionResultLabels[decision.result as keyof typeof DecisionResultLabels]}
              size="small"
              color={decision.result === 'APPROVED' ? 'success' : 'error'}
            />
          )}
        </Box>
        {decision.decidedAt && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Décision prise le {new Date(decision.decidedAt).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        )}
      </Box>

      {/* Résultats vote à la majorité */}
      {decision.decisionType === 'MAJORITY' && (() => {
        // Si la décision est retirée, afficher uniquement le statut
        if (decision.result === 'WITHDRAWN') {
          return (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5" fontWeight="semibold">Statut</Typography>
                <Chip
                  label="Proposition retirée"
                  color="error"
                  sx={{ px: 2, py: 1, fontWeight: 'medium' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {decision.decidedAt && (
                  <>
                    Décision finalisée le{' '}
                    {new Date(decision.decidedAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </Typography>
            </Box>
          );
        }

        // Déterminer les gagnants et les ex-aequo
        const winners = proposalResults.filter(r => r.isWinner);
        const maxVotes = Math.max(...proposalResults.map(r => r.voteCount));
        const hasExAequo = winners.length > 1;
        const otherProposals = proposalResults.filter(r => !r.isWinner);

        return (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>Résultats du vote</Typography>

            <Box sx={{ mb: 3 }}>
              <Typography color="text.secondary">
                {votingMode === 'PUBLIC_LINK' ? (
                  <>{totalVotes} vote{totalVotes > 1 ? 's' : ''}</>
                ) : (
                  <>{totalVotes} vote{totalVotes > 1 ? 's' : ''} sur {decision.participants.length} participant{decision.participants.length > 1 ? 's' : ''}</>
                )}
              </Typography>
            </Box>

            {/* Proposition gagnante (si gagnant clair) */}
            {!hasExAequo && winners.length === 1 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="semibold" color="success.main" sx={{ mb: 2 }}>
                  🏆 Proposition gagnante
                </Typography>
                {winners.map((result) => (
                  <Box
                    key={result.proposal.id}
                    sx={{ border: 2, borderColor: 'success.main', backgroundColor: 'success.light', borderRadius: 2, p: 2 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">🏆</span>
                          <span className="font-bold text-lg">{result.proposal.title}</span>
                          <Chip label="GAGNANT" size="small" color="success" sx={{ fontWeight: 'medium' }} />
                        </div>
                        {result.proposal.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{result.proposal.description}</Typography>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold">{result.voteCount}</div>
                        <Typography variant="body2" color="text.secondary">
                          {result.percentage.toFixed(1)}%
                        </Typography>
                      </div>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={result.percentage}
                      color="success"
                      sx={{ height: 12, borderRadius: 1, mt: 1 }}
                    />
                  </Box>
                ))}
              </Box>
            )}

            {/* Ex-aequo (si plusieurs gagnants à égalité) */}
            {hasExAequo && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="semibold" color="warning.main" sx={{ mb: 2 }}>
                  ⚖️ Ex-aequo ({winners.length} propositions à égalité)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {winners.map((result) => (
                    <Box
                      key={result.proposal.id}
                      sx={{ border: 2, borderColor: 'warning.main', backgroundColor: 'warning.light', borderRadius: 2, p: 2 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">⚖️</span>
                            <span className="font-bold text-lg">{result.proposal.title}</span>
                            <Chip label="EX-AEQUO" size="small" color="warning" sx={{ fontWeight: 'medium' }} />
                          </div>
                          {result.proposal.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{result.proposal.description}</Typography>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold">{result.voteCount}</div>
                          <Typography variant="body2" color="text.secondary">
                            {result.percentage.toFixed(1)}%
                          </Typography>
                        </div>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={result.percentage}
                        color="warning"
                        sx={{ height: 12, borderRadius: 1, mt: 1 }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Autres propositions (sans numérotation) */}
            {otherProposals.length > 0 && (
              <Box>
                <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>
                  Autres propositions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {otherProposals.map((result) => (
                    <Box
                      key={result.proposal.id}
                      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, backgroundColor: 'background.secondary' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-lg mb-1">
                            {result.proposal.title}
                          </div>
                          {result.proposal.description && (
                            <Typography variant="body2" color="text.secondary">{result.proposal.description}</Typography>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold">{result.voteCount}</div>
                          <Typography variant="body2" color="text.secondary">
                            {result.percentage.toFixed(1)}%
                          </Typography>
                        </div>
                      </div>
                      <LinearProgress
                        variant="determinate"
                        value={result.percentage}
                        color="primary"
                        sx={{ height: 12, borderRadius: 1, mt: 1 }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {decision.status === 'OPEN' && (
              <Alert severity="info" sx={{ mt: 3 }}>
                Le vote est toujours en cours. Ces résultats peuvent encore évoluer.
              </Alert>
            )}
          </Box>
        );
      })()}

      {/* Résultats vote nuancé  */}
      {decision.decisionType === 'NUANCED_VOTE' && (() => {
        // Si la décision est retirée, afficher uniquement le statut
        if (decision.result === 'WITHDRAWN') {
          return (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5" fontWeight="semibold">Statut</Typography>
                <Chip
                  label="Proposition retirée"
                  color="error"
                  sx={{ px: 2, py: 1, fontWeight: 'medium' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {decision.decidedAt && (
                  <>
                    Décision finalisée le{' '}
                    {new Date(decision.decidedAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </Typography>
            </Box>
          );
        }

        // Calculer le nombre de votes pour PUBLIC_LINK
        const votedCount = votingMode === 'PUBLIC_LINK'
          ? nuancedResults.length > 0 ? Object.values(nuancedResults[0].mentionProfile).reduce((sum, count) => sum + count, 0) : 0
          : decision.participants.filter(p => p.hasVoted).length;

        return (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>Résultats du vote nuancé</Typography>

            <Box sx={{ mb: 3 }}>
              <Typography color="text.secondary">
                {votingMode === 'PUBLIC_LINK' ? (
                  <>{votedCount} vote{votedCount > 1 ? 's' : ''}</>
                ) : (
                  <>{votedCount} vote{votedCount > 1 ? 's' : ''} sur {decision.participants.length} participant{decision.participants.length > 1 ? 's' : ''}</>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Échelle : {NuancedScaleLabels[decision.nuancedScale as keyof typeof NuancedScaleLabels]}
                {decision.nuancedWinnerCount && decision.nuancedWinnerCount > 1 &&
                  ` • ${decision.nuancedWinnerCount} propositions gagnantes`}
              </Typography>
            </Box>

          {/* Propositions gagnantes */}
          {decision.nuancedWinnerCount && nuancedResults.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight="semibold" color="success.main" sx={{ mb: 2 }}>
                🏆 {decision.nuancedWinnerCount === 1 ? 'Proposition gagnante' : `${decision.nuancedWinnerCount} propositions gagnantes`}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {nuancedResults.slice(0, decision.nuancedWinnerCount).map((result) => {
                  const mentionColor = getMentionColor(decision.nuancedScale || '5_LEVELS', result.majorityMention);
                  const mentionLabel = getMentionLabel(decision.nuancedScale || '5_LEVELS', result.majorityMention);
                  const totalMentions = Object.values(result.mentionProfile).reduce((sum, count) => sum + count, 0);

                  return (
                    <Box
                      key={result.proposalId}
                      sx={{ border: 2, borderColor: 'success.main', backgroundColor: 'success.light', borderRadius: 2, p: 2 }}
                    >
                      {/* En-tête */}
                      <Box sx={{ mb: 1.5 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🏆</span>
                          <span className="font-bold text-lg">{result.rank}. {result.title}</span>
                          <Chip label="GAGNANT" size="small" color="success" sx={{ fontWeight: 'medium' }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Typography variant="body2" color="text.secondary">Mention médiane :</Typography>
                          <span
                            className="px-3 py-1 rounded-lg text-sm font-semibold text-white"
                            style={{ backgroundColor: mentionColor }}
                          >
                            {mentionLabel}
                          </span>
                        </div>
                      </Box>

                      {/* Barre de distribution unique segmentée */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                          Distribution des mentions ({totalMentions} vote{totalMentions > 1 ? 's' : ''})
                        </Typography>

                        {/* Barre segmentée avec ligne médiane */}
                        <Box sx={{ position: 'relative' }}>
                          <Box sx={{ width: '100%', height: 40, display: 'flex', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                            {Object.entries(result.mentionProfile)
                              .sort((a, b) => {
                                // Trier par ordre des mentions (meilleure en premier)
                                const mentions = getMentionsForScale(decision.nuancedScale || '5_LEVELS');
                                return mentions.indexOf(a[0]) - mentions.indexOf(b[0]);
                              })
                              .map(([mention, count]) => {
                                const percentage = totalMentions > 0 ? (count / totalMentions) * 100 : 0;
                                const color = getMentionColor(decision.nuancedScale || '5_LEVELS', mention);

                                if (count === 0) return null;

                                return (
                                  <div
                                    key={mention}
                                    className="flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-90"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: color,
                                    }}
                                    title={`${getMentionLabel(decision.nuancedScale || '5_LEVELS', mention)}: ${count} vote${count > 1 ? 's' : ''} (${percentage.toFixed(1)}%)`}
                                  >
                                    {percentage >= 8 && <span>{count}</span>}
                                  </div>
                                );
                              })}
                          </Box>
                          {/* Lignes verticales médianes à 50% avec gap */}
                          {/* Ligne du haut */}
                          <div
                            className="absolute w-0.5"
                            style={{
                              top: '-3px',
                              height: '6px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              borderLeft: '2px dashed #000',
                              opacity: 0.3,
                              pointerEvents: 'none',
                            }}
                          />
                          {/* Ligne du bas */}
                          <div
                            className="absolute w-0.5"
                            style={{
                              top: 'calc(100% - 3px)',
                              height: '6px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              borderLeft: '2px dashed #000',
                              opacity: 0.3,
                              pointerEvents: 'none',
                            }}
                          />
                        </Box>

                        {/* Légende détaillée */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                          {Object.entries(result.mentionProfile)
                            .filter(([mention]) => {
                              // Filtrer les mentions obsolètes (ex: FAIRLY_GOOD)
                              const validMentions = getMentionsForScale(decision.nuancedScale || '5_LEVELS');
                              return validMentions.includes(mention);
                            })
                            .sort((a, b) => {
                              const mentions = getMentionsForScale(decision.nuancedScale || '5_LEVELS');
                              return mentions.indexOf(a[0]) - mentions.indexOf(b[0]);
                            })
                            .map(([mention, count]) => {
                              const percentage = totalMentions > 0 ? (count / totalMentions) * 100 : 0;
                              const color = getMentionColor(decision.nuancedScale || '5_LEVELS', mention);
                              const label = getMentionLabel(decision.nuancedScale || '5_LEVELS', mention);

                              return (
                                <div key={mention} className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <Typography variant="caption" sx={{ flex: 1 }}>{label}</Typography>
                                  <Typography variant="caption" fontWeight="medium">
                                    {count} <Typography component="span" variant="caption" color="text.secondary">({percentage.toFixed(0)}%)</Typography>
                                  </Typography>
                                </div>
                              );
                            })}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Toutes les propositions avec leur profil de mérite */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" fontWeight="semibold">
              {decision.nuancedWinnerCount && nuancedResults.length > decision.nuancedWinnerCount
                ? 'Autres propositions'
                : 'Classement complet'}
            </Typography>

            {nuancedResults.map((result) => {
              const mentionColor = getMentionColor(decision.nuancedScale || '5_LEVELS', result.majorityMention);
              const mentionLabel = getMentionLabel(decision.nuancedScale || '5_LEVELS', result.majorityMention);
              const totalMentions = Object.values(result.mentionProfile).reduce((sum, count) => sum + count, 0);
              const isWinner = decision.nuancedWinnerCount && result.rank <= decision.nuancedWinnerCount;

              return (
                <Box
                  key={result.proposalId}
                  sx={{
                    border: isWinner ? 2 : 1,
                    borderColor: isWinner ? 'success.light' : 'divider',
                    backgroundColor: isWinner ? 'success.light' : 'background.secondary',
                    borderRadius: 2,
                    p: 2
                  }}
                >
                  {/* En-tête de la proposition */}
                  <Box sx={{ mb: 1.5 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">
                        {result.rank}. {result.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Typography variant="body2" color="text.secondary">Mention médiane :</Typography>
                      <span
                        className="px-2 py-1 rounded text-sm font-semibold text-white"
                        style={{ backgroundColor: mentionColor }}
                      >
                        {mentionLabel}
                      </span>
                    </div>
                  </Box>

                  {/* Barre de distribution unique segmentée */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                      Distribution des mentions ({totalMentions} vote{totalMentions > 1 ? 's' : ''})
                    </Typography>

                    {/* Barre segmentée avec ligne médiane */}
                    <Box sx={{ position: 'relative' }}>
                      <Box sx={{ width: '100%', height: 40, display: 'flex', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                        {Object.entries(result.mentionProfile)
                          .sort((a, b) => {
                            // Trier par ordre des mentions (meilleure en premier)
                            const mentions = getMentionsForScale(decision.nuancedScale || '5_LEVELS');
                            return mentions.indexOf(a[0]) - mentions.indexOf(b[0]);
                          })
                          .map(([mention, count]) => {
                            const percentage = totalMentions > 0 ? (count / totalMentions) * 100 : 0;
                            const color = getMentionColor(decision.nuancedScale || '5_LEVELS', mention);

                            if (count === 0) return null;

                            return (
                              <div
                                key={mention}
                                className="flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-90"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: color,
                                }}
                                title={`${getMentionLabel(decision.nuancedScale || '5_LEVELS', mention)}: ${count} vote${count > 1 ? 's' : ''} (${percentage.toFixed(1)}%)`}
                              >
                                {percentage >= 8 && <span>{count}</span>}
                              </div>
                            );
                          })}
                      </Box>
                      {/* Lignes verticales médianes à 50% avec gap */}
                      {/* Ligne du haut */}
                      <div
                        className="absolute w-0.5"
                        style={{
                          top: '-3px',
                          height: '6px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          borderLeft: '2px dashed #000',
                          opacity: 0.3,
                          pointerEvents: 'none',
                        }}
                      />
                      {/* Ligne du bas */}
                      <div
                        className="absolute w-0.5"
                        style={{
                          top: 'calc(100% - 3px)',
                          height: '6px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          borderLeft: '2px dashed #000',
                          opacity: 0.3,
                          pointerEvents: 'none',
                        }}
                      />
                    </Box>

                    {/* Légende détaillée */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                      {Object.entries(result.mentionProfile)
                        .filter(([mention]) => {
                          // Filtrer les mentions obsolètes (ex: FAIRLY_GOOD)
                          const validMentions = getMentionsForScale(decision.nuancedScale || '5_LEVELS');
                          return validMentions.includes(mention);
                        })
                        .sort((a, b) => {
                          const mentions = getMentionsForScale(decision.nuancedScale || '5_LEVELS');
                          return mentions.indexOf(a[0]) - mentions.indexOf(b[0]);
                        })
                        .map(([mention, count]) => {
                          const percentage = totalMentions > 0 ? (count / totalMentions) * 100 : 0;
                          const color = getMentionColor(decision.nuancedScale || '5_LEVELS', mention);
                          const label = getMentionLabel(decision.nuancedScale || '5_LEVELS', mention);

                          return (
                            <div key={mention} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <Typography variant="caption" sx={{ flex: 1 }}>{label}</Typography>
                              <Typography variant="caption" fontWeight="medium">
                                {count} <Typography component="span" variant="caption" color="text.secondary">({percentage.toFixed(0)}%)</Typography>
                              </Typography>
                            </div>
                          );
                        })}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>

            {decision.status === 'OPEN' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Le vote est toujours en cours. Ces résultats peuvent encore évoluer.
              </Alert>
            )}
          </Box>
        );
      })()}

      {/* Résultats consensus */}
      {decision.decisionType === 'CONSENSUS' && (
        <>
          {/* Proposition finale */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>Proposition</Typography>

            {decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal ? (
              <Box>
                <Typography variant="body1" fontWeight="medium" color="primary.main" sx={{ mb: 1 }}>Proposition actuelle</Typography>
                <Box sx={{ p: 2, backgroundColor: 'primary.light', borderRadius: 1, border: 1, borderColor: 'primary.main' }}>
                  <p className="whitespace-pre-wrap">{decision.proposal}</p>
                </Box>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm" style={{ color: 'var(--mui-palette-text-secondary)' }}>
                    Voir la proposition initiale
                  </summary>
                  <Box sx={{ p: 2, backgroundColor: 'background.secondary', borderRadius: 1, border: 1, borderColor: 'divider', mt: 1 }}>
                    <p className="whitespace-pre-wrap">{decision.initialProposal}</p>
                  </Box>
                </details>
              </Box>
            ) : (
              <Box>
                <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>Proposition</Typography>
                <Box sx={{ p: 2, backgroundColor: 'background.secondary', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <p className="whitespace-pre-wrap">{decision.proposal || decision.initialProposal}</p>
                </Box>
              </Box>
            )}
          </Box>

          {/* Discussion */}
          {decision.comments.length > 0 && (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>Historique de la discussion</Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {decision.comments.map((comment) => (
                  <Box key={comment.id} sx={{ borderLeft: 4, borderColor: 'divider', pl: 2 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{comment.user?.name || 'Anonyme'}</span>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(comment.createdAt).toLocaleString('fr-FR')}
                        {new Date(comment.updatedAt) > new Date(comment.createdAt) && ' (modifié)'}
                      </Typography>
                    </div>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{comment.content}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Résultat du vote */}
          {decision.result === 'WITHDRAWN' ? (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5" fontWeight="semibold">Statut</Typography>
                <Chip
                  label="Proposition retirée"
                  color="error"
                  sx={{ px: 2, py: 1, fontWeight: 'medium' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {decision.decidedAt && (
                  <>
                    Décision finalisée le{' '}
                    {new Date(decision.decidedAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>Résultat du vote</Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                <Box sx={{ borderRadius: 2, p: 2, textAlign: 'center', backgroundColor: 'success.light', border: 1, borderColor: 'success.main' }}>
                  <Typography variant="h3" fontWeight="bold" color="success.dark">{agreeCount}</Typography>
                  <Typography variant="body2" color="success.dark">D'accord</Typography>
                </Box>
                <Box sx={{ borderRadius: 2, p: 2, textAlign: 'center', backgroundColor: 'error.light', border: 1, borderColor: 'error.main' }}>
                  <Typography variant="h3" fontWeight="bold" color="error.dark">{disagreeCount}</Typography>
                  <Typography variant="body2" color="error.dark">Pas d'accord</Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                {consensusReached ? (
                  <Box sx={{ backgroundColor: 'success.light', border: 1, borderColor: 'success.main', borderRadius: 2, p: 2 }}>
                    <Typography variant="body1" fontWeight="semibold" color="success.dark" sx={{ mb: 0.5 }}>
                      ✓ Consensus atteint
                    </Typography>
                    <Typography variant="body2" color="success.dark">
                      Tous les participants sont d'accord avec la proposition
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ backgroundColor: 'warning.light', border: 1, borderColor: 'warning.main', borderRadius: 2, p: 2 }}>
                    <Typography variant="body1" fontWeight="semibold" color="warning.dark" sx={{ mb: 0.5 }}>
                      Consensus non atteint
                    </Typography>
                    <Typography variant="body2" color="warning.dark">
                      {disagreeCount} participant{disagreeCount > 1 ? 's ne sont' : ' n\'est'} pas d'accord
                    </Typography>
                  </Box>
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                {votingMode === 'PUBLIC_LINK' ? (
                  <>{totalConsensusVotes} vote{totalConsensusVotes > 1 ? 's' : ''}</>
                ) : (
                  <>{totalConsensusVotes} vote{totalConsensusVotes > 1 ? 's' : ''} sur {decision.participants.length} participant{decision.participants.length > 1 ? 's' : ''}</>
                )}
              </Typography>

              {decision.status === 'OPEN' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Le vote est toujours en cours. Le consensus pourra être atteint si tous les participants votent "d'accord".
                </Alert>
              )}
            </Box>
          )}
        </>
      )}

      {/* Sollicitation d'avis */}
      {decision.decisionType === 'ADVICE_SOLICITATION' && (
        <>
          {/* Statut de la décision */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" fontWeight="semibold">Statut</Typography>
              {decision.result && (
                <Chip
                  label={
                    decision.result === 'WITHDRAWN'
                      ? 'Proposition retirée'
                      : decision.result === 'APPROVED'
                      ? 'Décision finale validée après sollicitation d\'avis'
                      : DecisionResultLabels[decision.result as keyof typeof DecisionResultLabels]
                  }
                  color={
                    decision.result === 'WITHDRAWN'
                      ? 'error'
                      : decision.result === 'APPROVED'
                      ? 'success'
                      : 'default'
                  }
                  sx={{ px: 2, py: 1, fontWeight: 'medium' }}
                />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary">
              {decision.status === 'OPEN' && (
                <>
                  {opinionResponses.length} avis reçu{opinionResponses.length > 1 ? 's' : ''} sur{' '}
                  {decision.participants.length} sollicité{decision.participants.length > 1 ? 's' : ''}
                </>
              )}
              {decision.status === 'CLOSED' && decision.decidedAt && (
                <>
                  Décision finalisée le{' '}
                  {new Date(decision.decidedAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </>
              )}
            </Typography>
          </Box>

          {/* Proposition de décision */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>Proposition de décision</Typography>
            <Box sx={{ p: 2, backgroundColor: 'background.secondary', borderRadius: 1, border: 1, borderColor: 'divider', whiteSpace: 'pre-wrap' }}>
              {decision.proposal || decision.initialProposal}
            </Box>
          </Box>

          {/* Avis reçus */}
          {opinionResponses.length > 0 && (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>
                Avis reçus ({opinionResponses.length}/{decision.participants.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {opinionResponses.map((opinion) => {
                  const authorName =
                    opinion.user?.name ||
                    opinion.externalParticipant?.externalName ||
                    'Anonyme';

                  return (
                    <Box key={opinion.id} sx={{ borderLeft: 4, borderColor: 'primary.main', pl: 2 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg">{authorName}</span>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(opinion.createdAt).toLocaleString('fr-FR')}
                          {new Date(opinion.updatedAt) > new Date(opinion.createdAt) &&
                            ' (modifié)'}
                        </Typography>
                      </div>
                      <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {opinion.content}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Avis en attente */}
          {decision.status === 'OPEN' &&
            opinionResponses.length < decision.participants.length && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                  Avis en attente ({decision.participants.length - opinionResponses.length})
                </Typography>
                <Typography variant="body2">
                  {decision.participants
                    .filter(
                      (p) =>
                        !opinionResponses.some(
                          (o) => o.userId === p.userId && o.userId !== null
                        )
                    )
                    .map((p) => p.user?.name || p.externalName || 'Utilisateur')
                    .join(', ')}{' '}
                  {decision.participants.filter(
                    (p) =>
                      !opinionResponses.some(
                        (o) => o.userId === p.userId && o.userId !== null
                      )
                  ).length > 0 && "n'ont pas encore donné leur avis"}
                </Typography>
              </Alert>
            )}

          {/* Décision finale (dans conclusion si status CLOSED) */}
          {decision.status === 'CLOSED' &&
            decision.result === 'APPROVED' &&
            decision.conclusion && (
              <Box sx={{ backgroundColor: 'success.light', border: 1, borderColor: 'success.main', borderRadius: 2, p: 3, mb: 3 }}>
                <Typography variant="h5" fontWeight="semibold" color="success.dark" sx={{ mb: 2 }}>
                  Décision finale
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {decision.conclusion}
                </Typography>
              </Box>
            )}
        </>
      )}

      {/* Décision par consentement */}
      {decision.decisionType === 'CONSENT' && (
        <>
          {/* Statut et résultat */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" fontWeight="semibold">Résultat</Typography>
              {decision.result && (
                <Chip
                  label={
                    decision.result === 'APPROVED' ? '✅ Approuvée (pas d\'objections)' :
                    decision.result === 'BLOCKED' ? '🚫 Bloquée (objections présentes)' :
                    decision.result === 'WITHDRAWN' ? '⚪ Retirée' :
                    DecisionResultLabels[decision.result as keyof typeof DecisionResultLabels]
                  }
                  color={
                    decision.result === 'APPROVED' ? 'success' :
                    decision.result === 'BLOCKED' ? 'error' :
                    'default'
                  }
                  sx={{ px: 2, py: 1, fontWeight: 'medium' }}
                />
              )}
            </Box>

            {/* Statistiques */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`${consentObjections.filter(o => o.status === 'NO_OBJECTION').length} consentements`}
                color="success"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`${consentObjections.filter(o => o.status === 'OBJECTION' && !o.withdrawnAt).length} objections`}
                color="error"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`${consentObjections.filter(o => o.status === 'NO_POSITION').length} sans position`}
                color="default"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`${clarificationQuestions.length} questions`}
                color="info"
                variant="outlined"
                size="small"
              />
            </Box>

            {decision.decidedAt && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Décision finalisée le{' '}
                {new Date(decision.decidedAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            )}
          </Box>

          {/* Propositions */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>Proposition</Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                {decision.proposal && decision.initialProposal !== decision.proposal ? 'Proposition initiale' : 'Proposition'}
              </Typography>
              <Box sx={{ p: 2, backgroundColor: 'background.secondary', borderRadius: 1, border: 1, borderColor: 'divider', whiteSpace: 'pre-wrap' }}>
                {decision.initialProposal}
              </Box>
            </Box>

            {decision.proposal && decision.initialProposal !== decision.proposal && (
              <Box>
                <Typography variant="body2" fontWeight="medium" color="primary" sx={{ mb: 1 }}>
                  Proposition amendée
                </Typography>
                <Box sx={{ p: 2, backgroundColor: 'primary.light', borderRadius: 1, border: 1, borderColor: 'primary.main', whiteSpace: 'pre-wrap' }}>
                  {decision.proposal}
                </Box>
              </Box>
            )}
          </Box>

          {/* Questions de clarification */}
          {clarificationQuestions.length > 0 && (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>
                Questions de clarification ({clarificationQuestions.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {clarificationQuestions.map((q: any) => (
                  <Box key={q.id} sx={{ borderLeft: 4, borderColor: 'info.main', pl: 2 }}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Question de {q.questioner?.name || q.externalQuestioner?.externalName || 'Anonyme'}
                      </Typography>
                      <Typography fontWeight="medium">{q.questionText}</Typography>
                    </Box>

                    {q.answerText && (
                      <Box sx={{ pl: 2, borderLeft: 2, borderColor: 'success.main', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Réponse du créateur
                        </Typography>
                        <Typography>{q.answerText}</Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Objections */}
          {consentObjections.length > 0 && (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="semibold" sx={{ mb: 2 }}>
                Positions des participants ({consentObjections.length}/{decision.participants.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {consentObjections.map((obj: any) => (
                  <Box
                    key={obj.id}
                    sx={{
                      p: 2,
                      backgroundColor: 'background.secondary',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: obj.objectionText ? 1 : 0 }}>
                      <Typography fontWeight="medium">
                        {obj.user?.name || obj.externalParticipant?.externalName || 'Anonyme'}
                      </Typography>
                      <Chip
                        label={
                          obj.status === 'NO_OBJECTION' ? '✅ Pas d\'objection' :
                          obj.status === 'OBJECTION' ? '🚫 Objection' :
                          '⚪ Sans position'
                        }
                        color={
                          obj.status === 'NO_OBJECTION' ? 'success' :
                          obj.status === 'OBJECTION' ? 'error' :
                          'default'
                        }
                        size="small"
                      />
                    </Box>
                    {obj.objectionText && (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                        {obj.objectionText}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Conclusion pour CONSENT */}
          {decision.conclusion && (
            <Box sx={{ backgroundColor: 'primary.light', border: 1, borderColor: 'primary.main', borderRadius: 2, p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="semibold" color="primary.dark" sx={{ mb: 2 }}>
                Conclusion
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {decision.conclusion}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Détails du résultat */}
      {decision.resultDetails && (
        <Box sx={{ backgroundColor: 'background.secondary', border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
          <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>Détails</Typography>
          <Typography>{decision.resultDetails}</Typography>
        </Box>
      )}

      {/* Conclusion (pour types de décision autres qu'ADVICE_SOLICITATION) */}
      {decision.conclusion && decision.decisionType !== 'ADVICE_SOLICITATION' && (
        <Box sx={{ backgroundColor: 'primary.light', border: 1, borderColor: 'primary.main', borderRadius: 2, p: 3, mb: 3 }}>
          <Typography variant="h5" fontWeight="semibold" color="primary.dark" sx={{ mb: 2 }}>Conclusion</Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
            {decision.conclusion}
          </Typography>
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          component={Link}
          href={`/${slug}`}
          variant="outlined"
          sx={{ px: 3, py: 1 }}
        >
          Retour aux décisions
        </Button>
        {/* Bouton "Retour au vote" uniquement pour les décisions INVITED avec status OPEN */}
        {decision.status === 'OPEN' && votingMode !== 'PUBLIC_LINK' && (
          <Button
            component={Link}
            href={`/${slug}/decisions/${decision.id}/vote`}
            variant="contained"
            color="primary"
            sx={{ px: 3, py: 1 }}
          >
            Retour au vote
          </Button>
        )}
        {isCreator && votingMode === 'PUBLIC_LINK' && decision.status === 'OPEN' && (
          <Button
            component={Link}
            href={`/${slug}/decisions/${decision.id}/share`}
            variant="outlined"
            sx={{ px: 3, py: 1 }}
          >
            Retour au partage
          </Button>
        )}
        {isCreator && votingMode !== 'PUBLIC_LINK' && (
          <Button
            component={Link}
            href={`/${slug}/decisions/${decision.id}/admin`}
            variant="outlined"
            sx={{ px: 3, py: 1 }}
          >
            Administrer
          </Button>
        )}
      </Box>
    </div>
  );
}
