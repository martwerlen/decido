'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, Chip, Typography, Button, Alert } from '@mui/material';
import {
  DecisionStatusLabels,
  DecisionTypeLabels,
  getMentionsForScale,
  getMentionLabel,
  getMentionColor,
  NuancedScaleLabels,
} from '@/types/enums';
import HistoryButton from '@/components/decisions/HistoryButton';
import HistoryPanel from '@/components/decisions/HistoryPanel';
import { useSidebarRefresh } from '@/components/providers/SidebarRefreshProvider';
import UserAvatar from '@/components/common/UserAvatar';
import ConsentVoteClient from './ConsentVoteClient';

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  order: number;
}

interface NuancedProposal {
  id: string;
  title: string;
  description: string | null;
  order: number;
}

interface NuancedVote {
  id: string;
  proposalId: string;
  mention: string;
  proposal: NuancedProposal;
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
  replies: Array<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
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

interface TeamMember {
  organizationMember: {
    userId: string;
  };
}

interface OrganizationTeam {
  id: string;
  name: string;
  members: TeamMember[];
}

interface Decision {
  id: string;
  title: string;
  description: string;
  decisionType: string;
  status: string;
  initialProposal: string | null;
  proposal: string | null;
  endDate: Date | null;
  nuancedScale?: string | null;
  nuancedWinnerCount?: number | null;
  proposals: Proposal[];
  nuancedProposals?: NuancedProposal[];
  comments: Comment[];
  participants: any[];
  creator: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

interface Props {
  decision: Decision;
  userVote: { id: string; value: string } | null;
  userProposalVote: { id: string; proposalId: string; proposal: Proposal } | null;
  userNuancedVotes: NuancedVote[] | null;
  userOpinion: { id: string; content: string } | null;
  allOpinions: OpinionResponse[] | null;
  clarificationQuestions?: any[] | null;
  userObjection?: any | null;
  allObjections?: any[] | null;
  organizationTeams: OrganizationTeam[];
  slug: string;
  userId: string;
  isCreator: boolean;
}

export default function VotePageClient({
  decision,
  userVote: initialUserVote,
  userProposalVote: initialUserProposalVote,
  userNuancedVotes: initialUserNuancedVotes,
  userOpinion: initialUserOpinion,
  allOpinions: initialAllOpinions,
  clarificationQuestions,
  userObjection,
  allObjections,
  organizationTeams,
  slug,
  userId,
  isCreator,
}: Props) {
  const router = useRouter();
  const { refreshSidebar } = useSidebarRefresh();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Vote à la majorité
  const [selectedProposal, setSelectedProposal] = useState(
    initialUserProposalVote?.proposalId || ''
  );

  // Vote consensus
  const [consensusVote, setConsensusVote] = useState(initialUserVote?.value || '');

  // Vote nuancé - Map de proposalId -> mention
  const initialNuancedVotes: Record<string, string> = {};
  if (initialUserNuancedVotes) {
    initialUserNuancedVotes.forEach(vote => {
      initialNuancedVotes[vote.proposalId] = vote.mention;
    });
  }
  const [nuancedVotes, setNuancedVotes] = useState<Record<string, string>>(initialNuancedVotes);

  // Sollicitation d'avis
  const [opinionContent, setOpinionContent] = useState(initialUserOpinion?.content || '');
  const [allOpinions, setAllOpinions] = useState(initialAllOpinions || []);

  // Commentaires
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  // Historique
  const [historyOpen, setHistoryOpen] = useState(false);

  const isOpen = decision.status === 'OPEN';

  // Vérifier si le participant est sollicité pour un avis
  const isSolicited = decision.participants.some(p => p.userId === userId);

  const hasVoted = decision.decisionType === 'MAJORITY'
    ? !!initialUserProposalVote
    : decision.decisionType === 'NUANCED_VOTE'
    ? initialUserNuancedVotes && initialUserNuancedVotes.length > 0
    : decision.decisionType === 'ADVICE_SOLICITATION'
    ? !!initialUserOpinion
    : !!initialUserVote;

  // Vote pour une proposition (majorité)
  const handleVoteProposal = async () => {
    if (!selectedProposal) {
      setError('Veuillez sélectionner une proposition');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/${slug}/decisions/${decision.id}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId: selectedProposal }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setSuccess('Votre vote a été enregistré !');
      refreshSidebar();
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Vote consensus (d'accord/pas d'accord)
  const handleVoteConsensus = async (value: 'AGREE' | 'DISAGREE') => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/${slug}/decisions/${decision.id}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { consensusReached } = await response.json();

      if (consensusReached) {
        setSuccess('Consensus atteint ! La décision est approuvée.');
        refreshSidebar();
        setTimeout(() => {
          router.push(`/organizations/${slug}/decisions/${decision.id}/results`);
        }, 2000);
      } else {
        setSuccess('Votre vote a été enregistré !');
        setConsensusVote(value);
        refreshSidebar();
      }

      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Vote nuancé - Soumettre tous les votes
  const handleVoteNuanced = async () => {
    // Vérifier que toutes les propositions ont une mention
    const proposalIds = decision.nuancedProposals?.map(p => p.id) || [];
    const missingVotes = proposalIds.filter(id => !nuancedVotes[id]);

    if (missingVotes.length > 0) {
      setError('Vous devez attribuer une mention à toutes les propositions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/${slug}/decisions/${decision.id}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nuancedVotes }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setSuccess('Votre vote a été enregistré !');
      refreshSidebar();
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Soumettre un avis (ADVICE_SOLICITATION)
  const handleSubmitOpinion = async () => {
    if (!opinionContent.trim()) {
      setError('L\'avis ne peut pas être vide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/${slug}/decisions/${decision.id}/opinions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: opinionContent }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { opinion, isUpdate } = await response.json();

      // Mettre à jour la liste des avis
      if (isUpdate) {
        setAllOpinions(allOpinions.map(o => o.id === opinion.id ? opinion : o));
        setSuccess('Votre avis a été mis à jour !');
      } else {
        setAllOpinions([...allOpinions, opinion]);
        setSuccess('Votre avis a été enregistré !');
      }

      refreshSidebar();
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un commentaire
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      setError('Le commentaire ne peut pas être vide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/${slug}/decisions/${decision.id}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newComment }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setNewComment('');
      setSuccess('Commentaire ajouté !');
      setTimeout(() => {
        router.refresh();
        setSuccess('');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Modifier un commentaire
  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) {
      setError('Le commentaire ne peut pas être vide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/${slug}/decisions/${decision.id}/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editingCommentContent }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setEditingCommentId(null);
      setEditingCommentContent('');
      setSuccess('Commentaire modifié !');
      setTimeout(() => {
        router.refresh();
        setSuccess('');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Render CONSENT voting interface
  if (decision.decisionType === 'CONSENT') {
    return (
      <ConsentVoteClient
        decision={decision}
        clarificationQuestions={clarificationQuestions || null}
        userObjection={userObjection || null}
        allObjections={allObjections || null}
        organizationTeams={organizationTeams}
        slug={slug}
        userId={userId}
        isCreator={isCreator}
      />
    );
  }

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">Créée par</Typography>
          <UserAvatar user={decision.creator} size="small" />
          <Typography variant="body2" fontWeight="medium">{decision.creator.name}</Typography>
        </Box>
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
        </Box>
        {decision.endDate && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Date limite : {new Date(decision.endDate).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {!isOpen && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded mb-4">
          <p className="text-yellow-800">
            Cette décision n'est plus ouverte au vote.{' '}
            <Link
              href={`/${slug}/decisions/${decision.id}/results`}
              className="underline"
            >
              Voir les résultats
            </Link>
          </p>
        </div>
      )}

      {/* Vote à la majorité */}
      {decision.decisionType === 'MAJORITY' && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
          <h2 className="text-xl font-semibold mb-4">Propositions</h2>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Choisissez une proposition parmi les options suivantes :
          </Typography>

          <div className="space-y-3 mb-6">
            {decision.proposals.map((proposal) => (
              <Box
                component="label"
                key={proposal.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  p: 2,
                  border: 2,
                  borderColor: selectedProposal === proposal.id ? 'primary.main' : 'divider',
                  backgroundColor: selectedProposal === proposal.id ? 'primary.light' : 'transparent',
                  borderRadius: 2,
                  cursor: isOpen ? 'pointer' : 'not-allowed',
                  opacity: isOpen ? 1 : 0.6,
                  transition: 'all 0.2s',
                  '&:hover': isOpen ? { borderColor: selectedProposal === proposal.id ? 'primary.main' : 'text.secondary' } : {}
                }}
              >
                <input
                  type="radio"
                  name="proposal"
                  value={proposal.id}
                  checked={selectedProposal === proposal.id}
                  onChange={(e) => setSelectedProposal(e.target.value)}
                  disabled={!isOpen}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">{proposal.title}</div>
                  {proposal.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{proposal.description}</Typography>
                  )}
                </div>
              </Box>
            ))}
          </div>

          {isOpen && (
            <Button
              onClick={handleVoteProposal}
              disabled={loading || !selectedProposal}
              variant="contained"
              color="primary"
              fullWidth
              sx={{ py: 1.5, fontWeight: 'medium' }}
            >
              {loading ? 'Enregistrement...' : hasVoted ? 'Modifier mon vote' : 'Voter'}
            </Button>
          )}

          {hasVoted && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1, textAlign: 'center' }}>
              ✓ Vous avez voté pour : {initialUserProposalVote?.proposal.title}
            </Typography>
          )}
        </Box>
      )}

      {/* Vote nuancé */}
      {decision.decisionType === 'NUANCED_VOTE' && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
          <h2 className="text-xl font-semibold mb-4">Vote nuancé</h2>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Évaluez chaque proposition en lui attribuant une mention.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Échelle : {NuancedScaleLabels[decision.nuancedScale as keyof typeof NuancedScaleLabels]}
          </Typography>

          <div className="space-y-4 mb-6">
            {decision.nuancedProposals?.map((proposal) => {
              const mentions = getMentionsForScale(decision.nuancedScale || '5_LEVELS');
              const selectedMention = nuancedVotes[proposal.id];

              return (
                <Box key={proposal.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <h3 className="font-semibold text-lg mb-2">{proposal.title}</h3>
                  {proposal.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{proposal.description}</Typography>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {mentions.map((mention) => {
                      const label = getMentionLabel(decision.nuancedScale || '5_LEVELS', mention);
                      const color = getMentionColor(decision.nuancedScale || '5_LEVELS', mention);
                      const isSelected = selectedMention === mention;

                      return (
                        <button
                          key={mention}
                          onClick={() => {
                            if (isOpen) {
                              setNuancedVotes(prev => ({
                                ...prev,
                                [proposal.id]: mention,
                              }));
                            }
                          }}
                          disabled={!isOpen}
                          className={`px-4 py-2 rounded-lg border-2 transition font-medium ${
                            isSelected
                              ? 'border-gray-800 shadow-md'
                              : 'border-transparent hover:border-gray-300'
                          } ${!isOpen ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                          style={{
                            backgroundColor: isSelected ? color : `${color}33`,
                            color: isSelected ? '#fff' : '#333',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Box>
              );
            })}
          </div>

          {isOpen && (
            <Button
              onClick={handleVoteNuanced}
              disabled={loading || Object.keys(nuancedVotes).length !== (decision.nuancedProposals?.length || 0)}
              variant="contained"
              color="primary"
              fullWidth
              sx={{ py: 1.5, fontWeight: 'medium' }}
            >
              {loading ? 'Enregistrement...' : hasVoted ? 'Modifier mon vote' : 'Voter'}
            </Button>
          )}

          {hasVoted && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1, textAlign: 'center' }}>
              ✓ Vous avez déjà voté
            </Typography>
          )}
        </Box>
      )}

      {/* Vote consensus */}
      {decision.decisionType === 'CONSENSUS' && (
        <>
          {/* Proposition */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
            <h2 className="text-xl font-semibold mb-4">Proposition</h2>

            {/* Afficher proposition initiale si elle diffère de la proposition actuelle */}
            {decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>Proposition initiale</Typography>
                <Box sx={{ p: 2, backgroundColor: 'background.secondary', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <p className="whitespace-pre-wrap">{decision.initialProposal}</p>
                </Box>
              </Box>
            )}

            {/* Afficher la proposition actuelle */}
            <div>
              {decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal ? (
                <Typography variant="body1" fontWeight="medium" color="primary.main" sx={{ mb: 1 }}>Proposition actuelle</Typography>
              ) : (
                <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>Proposition</Typography>
              )}
              <Box sx={{
                p: 2,
                borderRadius: 1,
                border: 1,
                backgroundColor: decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal ? 'primary.light' : 'background.secondary',
                borderColor: decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal ? 'primary.main' : 'divider'
              }}>
                <p className="whitespace-pre-wrap">{decision.proposal || decision.initialProposal}</p>
              </Box>
            </div>
          </Box>

          {/* Commentaires */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Discussion</h2>

            {decision.comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun commentaire pour le moment</p>
            ) : (
              <div className="space-y-4 mb-6">
                {decision.comments.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{comment.user?.name || 'Anonyme'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString('fr-FR')}
                            {new Date(comment.updatedAt) > new Date(comment.createdAt) && ' (modifié)'}
                          </span>
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingCommentContent}
                              onChange={(e) => setEditingCommentContent(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateComment(comment.id)}
                                disabled={loading}
                                className="text-sm text-white px-3 py-1 rounded"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentContent('');
                                }}
                                className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        )}
                      </div>

                      {comment.user?.id === userId && isOpen && !editingCommentId && (
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingCommentContent(comment.content);
                          }}
                          className="text-sm text-blue-600 hover:underline ml-2"
                        >
                          Modifier
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isOpen && (
              <div className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Ajoutez votre commentaire..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={loading}
                  className="text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                >
                  {loading ? 'Envoi...' : 'Ajouter un commentaire'}
                </button>
              </div>
            )}
          </div>

          {/* Vote d'accord/pas d'accord */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3 }}>
            <h2 className="text-xl font-semibold mb-4">Votre position</h2>

            {isOpen ? (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  onClick={() => handleVoteConsensus('AGREE')}
                  disabled={loading}
                  variant={consensusVote === 'AGREE' ? 'contained' : 'outlined'}
                  color="success"
                  fullWidth
                  sx={{ py: 2, fontWeight: 'medium' }}
                >
                  ✓ D'accord
                </Button>
                <Button
                  onClick={() => handleVoteConsensus('DISAGREE')}
                  disabled={loading}
                  variant={consensusVote === 'DISAGREE' ? 'contained' : 'outlined'}
                  color="error"
                  fullWidth
                  sx={{ py: 2, fontWeight: 'medium' }}
                >
                  ✗ Pas d'accord
                </Button>
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Le vote est fermé
              </Typography>
            )}

            {hasVoted && (
              <Typography variant="body2" sx={{ textAlign: 'center', mt: 1.5 }}>
                Votre vote actuel : {consensusVote === 'AGREE' ? (
                  <Typography component="span" color="success.main" fontWeight="medium">✓ D'accord</Typography>
                ) : (
                  <Typography component="span" color="error.main" fontWeight="medium">✗ Pas d'accord</Typography>
                )}
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* Sollicitation d'avis */}
      {decision.decisionType === 'ADVICE_SOLICITATION' && (
        <>
          {/* Proposition de décision */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Proposition de décision</h2>
            <div className="p-4 bg-gray-50 rounded border whitespace-pre-wrap">
              {decision.proposal || decision.initialProposal}
            </div>
          </div>

          {/* Avis déjà donnés */}
          {allOpinions.length > 0 && (
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Avis reçus ({allOpinions.length})</h2>
              <div className="space-y-4">
                {allOpinions.map((opinion) => {
                  const authorName = opinion.user?.name || opinion.externalParticipant?.externalName || 'Anonyme';
                  const isCurrentUser = opinion.userId === userId;

                  return (
                    <div key={opinion.id} className={`border-l-4 pl-4 ${isCurrentUser ? 'border-blue-500' : 'border-gray-300'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{authorName}</span>
                        {isCurrentUser && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Votre avis</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(opinion.createdAt).toLocaleString('fr-FR')}
                          {new Date(opinion.updatedAt) > new Date(opinion.createdAt) && ' (modifié)'}
                        </span>
                      </div>
                      <div className="text-gray-700 whitespace-pre-wrap">{opinion.content}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Avis en attente */}
          {allOpinions.length < decision.participants.length && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                {decision.participants.length - allOpinions.length} avis en attente sur {decision.participants.length} sollicité{decision.participants.length > 1 ? 's' : ''}
              </p>
              <div className="mt-2 text-sm text-blue-700">
                {decision.participants
                  .filter(p => !allOpinions.some(o => o.userId === p.userId))
                  .map(p => p.user?.name || p.externalName || 'Utilisateur')
                  .map((name, idx, arr) => (
                    <span key={idx}>
                      {name}{idx < arr.length - 1 && ', '}
                    </span>
                  ))}
                {decision.participants.filter(p => !allOpinions.some(o => o.userId === p.userId)).length > 0 && ' n\'ont pas encore donné leur avis'}
              </div>
            </div>
          )}

          {/* Formulaire d'avis (uniquement pour les participants sollicités) */}
          {isSolicited && isOpen && (
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {hasVoted ? 'Modifier votre avis' : 'Donner votre avis'}
              </h2>
              <div className="space-y-3">
                <textarea
                  value={opinionContent}
                  onChange={(e) => setOpinionContent(e.target.value)}
                  rows={6}
                  placeholder="Partagez votre avis sur cette proposition de décision..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSubmitOpinion}
                  disabled={loading || !opinionContent.trim()}
                  className="w-full text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                >
                  {loading ? 'Enregistrement...' : hasVoted ? 'Mettre à jour mon avis' : 'Enregistrer mon avis'}
                </button>
              </div>
            </div>
          )}

          {/* Message pour les non-sollicités */}
          {!isSolicited && isOpen && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                ℹ️ Vous n'êtes pas sollicité pour donner votre avis sur cette décision, mais vous pouvez la consulter et ajouter des commentaires ci-dessous.
              </p>
            </div>
          )}

          {/* Commentaires (accessible à tous les membres) */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Commentaires</h2>

            {decision.comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun commentaire pour le moment</p>
            ) : (
              <div className="space-y-4 mb-6">
                {decision.comments.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{comment.user?.name || 'Anonyme'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString('fr-FR')}
                            {new Date(comment.updatedAt) > new Date(comment.createdAt) && ' (modifié)'}
                          </span>
                        </div>

                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>

                        {/* Réponses */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
                            {comment.replies.map((reply) => (
                              <div key={reply.id}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{reply.user?.name || 'Anonyme'}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(reply.createdAt).toLocaleString('fr-FR')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter un commentaire */}
            {isOpen && (
              <div className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Ajouter un commentaire..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  className="text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                >
                  {loading ? 'Envoi...' : 'Ajouter un commentaire'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          component={Link}
          href={`/${slug}/decisions`}
          variant="outlined"
        >
          Retour
        </Button>
        {isCreator && (
          <Link
            href={`/${slug}/decisions/${decision.id}/admin`}
            className="px-6 py-2 text-white rounded-lg"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
          >
            Administrer
          </Link>
        )}
        {/* Masquer les résultats pour ADVICE_SOLICITATION en cours */}
        {(decision.decisionType !== 'ADVICE_SOLICITATION' || !isOpen) && (
          <Link
            href={`/${slug}/decisions/${decision.id}/results`}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Voir les résultats
          </Link>
        )}
      </Box>
    </div>
  );
}
