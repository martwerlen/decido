'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DecisionStatusLabels, DecisionTypeLabels } from '@/types/enums';
import HistoryButton from '@/components/decisions/HistoryButton';
import HistoryPanel from '@/components/decisions/HistoryPanel';

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  order: number;
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

interface Decision {
  id: string;
  title: string;
  description: string;
  decisionType: string;
  status: string;
  initialProposal: string | null;
  proposal: string | null;
  endDate: Date | null;
  proposals: Proposal[];
  comments: Comment[];
  participants: any[];
}

interface Props {
  decision: Decision;
  userVote: { id: string; value: string } | null;
  userProposalVote: { id: string; proposalId: string; proposal: Proposal } | null;
  slug: string;
  userId: string;
  isCreator: boolean;
}

export default function VotePageClient({
  decision,
  userVote: initialUserVote,
  userProposalVote: initialUserProposalVote,
  slug,
  userId,
  isCreator,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Vote à la majorité
  const [selectedProposal, setSelectedProposal] = useState(
    initialUserProposalVote?.proposalId || ''
  );

  // Vote consensus
  const [consensusVote, setConsensusVote] = useState(initialUserVote?.value || '');

  // Commentaires
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  // Historique
  const [historyOpen, setHistoryOpen] = useState(false);

  const isOpen = decision.status === 'OPEN';
  const hasVoted = decision.decisionType === 'MAJORITY'
    ? !!initialUserProposalVote
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
        `/api/organizations/${slug}/decisions/${decision.id}/vote`,
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
        `/api/organizations/${slug}/decisions/${decision.id}/vote`,
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
        setTimeout(() => {
          router.push(`/organizations/${slug}/decisions/${decision.id}/results`);
        }, 2000);
      } else {
        setSuccess('Votre vote a été enregistré !');
        setConsensusVote(value);
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
        `/api/organizations/${slug}/decisions/${decision.id}/comments`,
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
        `/api/organizations/${slug}/decisions/${decision.id}/comments/${commentId}`,
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{decision.title}</h1>
        <p className="text-gray-600 mt-2">{decision.description}</p>
        <div className="flex gap-2 mt-4">
          <span className="bg-gray-100 px-3 py-1 rounded text-sm">
            {DecisionStatusLabels[decision.status as keyof typeof DecisionStatusLabels]}
          </span>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
            {DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
          </span>
        </div>
        {decision.endDate && (
          <p className="text-sm text-gray-600 mt-2">
            Date limite : {new Date(decision.endDate).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {!isOpen && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded mb-4">
          <p className="text-yellow-800">
            Cette décision n'est plus ouverte au vote.{' '}
            <Link
              href={`/organizations/${slug}/decisions/${decision.id}/results`}
              className="underline"
            >
              Voir les résultats
            </Link>
          </p>
        </div>
      )}

      {/* Vote à la majorité */}
      {decision.decisionType === 'MAJORITY' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Propositions</h2>
          <p className="text-gray-600 mb-4">
            Choisissez une proposition parmi les options suivantes :
          </p>

          <div className="space-y-3 mb-6">
            {decision.proposals.map((proposal) => (
              <label
                key={proposal.id}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedProposal === proposal.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!isOpen ? 'cursor-not-allowed opacity-60' : ''}`}
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
                    <div className="text-sm text-gray-600 mt-1">{proposal.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>

          {isOpen && (
            <button
              onClick={handleVoteProposal}
              disabled={loading || !selectedProposal}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Enregistrement...' : hasVoted ? 'Modifier mon vote' : 'Voter'}
            </button>
          )}

          {hasVoted && (
            <p className="text-sm text-green-600 mt-2 text-center">
              ✓ Vous avez voté pour : {initialUserProposalVote?.proposal.title}
            </p>
          )}
        </div>
      )}

      {/* Vote consensus */}
      {decision.decisionType === 'CONSENSUS' && (
        <>
          {/* Proposition */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Proposition</h2>

            {/* Afficher proposition initiale si elle diffère de la proposition actuelle */}
            {decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Proposition initiale</h3>
                <div className="p-4 bg-gray-50 rounded border">
                  <p className="whitespace-pre-wrap">{decision.initialProposal}</p>
                </div>
              </div>
            )}

            {/* Afficher la proposition actuelle */}
            <div>
              {decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal ? (
                <h3 className="font-medium text-blue-700 mb-2">Proposition actuelle</h3>
              ) : (
                <h3 className="font-medium text-gray-700 mb-2">Proposition</h3>
              )}
              <div className={`p-4 rounded border ${decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                <p className="whitespace-pre-wrap">{decision.proposal || decision.initialProposal}</p>
              </div>
            </div>
          </div>

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
                                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
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
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Envoi...' : 'Ajouter un commentaire'}
                </button>
              </div>
            )}
          </div>

          {/* Vote d'accord/pas d'accord */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Votre position</h2>

            {isOpen ? (
              <div className="flex gap-4">
                <button
                  onClick={() => handleVoteConsensus('AGREE')}
                  disabled={loading}
                  className={`flex-1 py-4 rounded-lg font-medium transition ${
                    consensusVote === 'AGREE'
                      ? 'bg-green-600 text-white'
                      : 'border-2 border-green-600 text-green-600 hover:bg-green-50'
                  } disabled:opacity-50`}
                >
                  ✓ D'accord
                </button>
                <button
                  onClick={() => handleVoteConsensus('DISAGREE')}
                  disabled={loading}
                  className={`flex-1 py-4 rounded-lg font-medium transition ${
                    consensusVote === 'DISAGREE'
                      ? 'bg-red-600 text-white'
                      : 'border-2 border-red-600 text-red-600 hover:bg-red-50'
                  } disabled:opacity-50`}
                >
                  ✗ Pas d'accord
                </button>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">
                Le vote est fermé
              </p>
            )}

            {hasVoted && (
              <p className="text-sm text-center mt-3">
                Votre vote actuel : {consensusVote === 'AGREE' ? (
                  <span className="text-green-600 font-medium">✓ D'accord</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Pas d'accord</span>
                )}
              </p>
            )}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex gap-4 mt-6">
        <Link
          href={`/organizations/${slug}/decisions`}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Retour
        </Link>
        {isCreator && (
          <Link
            href={`/organizations/${slug}/decisions/${decision.id}/admin`}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Administrer
          </Link>
        )}
        <Link
          href={`/organizations/${slug}/decisions/${decision.id}/results`}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Voir les résultats
        </Link>
      </div>
    </div>
  );
}
