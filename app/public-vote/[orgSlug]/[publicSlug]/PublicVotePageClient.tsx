'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  order: number;
}

interface PublicVotePageClientProps {
  decision: {
    id: string;
    title: string;
    description: string;
    decisionType: string;
    endDate: string | null;
    initialProposal: string | null;
    proposal: string | null;
    nuancedScale: string | null;
    proposals: Proposal[];
    nuancedProposals: Proposal[];
  };
  orgSlug: string;
  publicSlug: string;
}

// Mentions pour vote nuancé
const NUANCED_MENTIONS = {
  '3_LEVELS': [
    { value: 'GOOD', label: 'Bon', color: 'bg-green-100 text-green-800' },
    { value: 'PASSABLE', label: 'Passable', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'INSUFFICIENT', label: 'Insuffisant', color: 'bg-red-100 text-red-800' },
  ],
  '5_LEVELS': [
    { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-500 text-white' },
    { value: 'GOOD', label: 'Bien', color: 'bg-green-300 text-gray-800' },
    { value: 'PASSABLE', label: 'Passable', color: 'bg-yellow-300 text-gray-800' },
    { value: 'INSUFFICIENT', label: 'Insuffisant', color: 'bg-orange-300 text-gray-800' },
    { value: 'TO_REJECT', label: 'À rejeter', color: 'bg-red-500 text-white' },
  ],
  '7_LEVELS': [
    { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-600 text-white' },
    { value: 'VERY_GOOD', label: 'Très bien', color: 'bg-green-400 text-white' },
    { value: 'GOOD', label: 'Bien', color: 'bg-green-200 text-gray-800' },
    { value: 'FAIRLY_GOOD', label: 'Assez bien', color: 'bg-yellow-200 text-gray-800' },
    { value: 'PASSABLE', label: 'Passable', color: 'bg-yellow-300 text-gray-800' },
    { value: 'INSUFFICIENT', label: 'Insuffisant', color: 'bg-orange-400 text-white' },
    { value: 'TO_REJECT', label: 'À rejeter', color: 'bg-red-600 text-white' },
  ],
};

export default function PublicVotePageClient({
  decision,
  orgSlug,
  publicSlug,
}: PublicVotePageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // États pour les différents types de votes
  const [consensusVote, setConsensusVote] = useState<'AGREE' | 'DISAGREE' | null>(null);
  const [majorityVote, setMajorityVote] = useState<string | null>(null);
  const [nuancedVotes, setNuancedVotes] = useState<Record<string, string>>({});

  // Vérifier si l'utilisateur a déjà voté (via localStorage)
  useEffect(() => {
    const voteKey = `vote_${decision.id}`;
    const existingVote = localStorage.getItem(voteKey);
    if (existingVote) {
      try {
        const parsed = JSON.parse(existingVote);
        if (decision.decisionType === 'CONSENSUS') {
          setConsensusVote(parsed.value);
        } else if (decision.decisionType === 'MAJORITY') {
          setMajorityVote(parsed.proposalId);
        } else if (decision.decisionType === 'NUANCED_VOTE') {
          setNuancedVotes(parsed.votes);
        }
      } catch (e) {
        console.error('Error parsing existing vote:', e);
      }
    }
  }, [decision.id, decision.decisionType]);

  // Soumettre le vote
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Préparer le payload selon le type de décision
      let payload: any = {};

      if (decision.decisionType === 'CONSENSUS') {
        if (!consensusVote) {
          setError('Veuillez sélectionner une option');
          setLoading(false);
          return;
        }
        payload.value = consensusVote;
      } else if (decision.decisionType === 'MAJORITY') {
        if (!majorityVote) {
          setError('Veuillez sélectionner une proposition');
          setLoading(false);
          return;
        }
        payload.proposalId = majorityVote;
      } else if (decision.decisionType === 'NUANCED_VOTE') {
        // Vérifier que toutes les propositions ont une mention
        const allVoted = decision.nuancedProposals.every(p => nuancedVotes[p.id]);
        if (!allVoted) {
          setError('Veuillez attribuer une mention à toutes les propositions');
          setLoading(false);
          return;
        }
        payload.votes = nuancedVotes;
      }

      // Envoyer le vote à l'API
      const response = await fetch(`/api/public-vote/${orgSlug}/${publicSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement du vote');
      }

      // Sauvegarder dans localStorage
      const voteKey = `vote_${decision.id}`;
      localStorage.setItem(voteKey, JSON.stringify(payload));

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
    }
  };

  // Afficher le message de confirmation
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Vote enregistré !</h1>
          <p className="text-gray-600 mb-6">
            Merci pour votre participation. Votre vote a été enregistré avec succès.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="text-blue-600 hover:underline"
          >
            Modifier mon vote
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">{decision.title}</h1>
          <p className="text-gray-600 mb-4">{decision.description}</p>
          {decision.endDate && (
            <p className="text-sm text-gray-500">
              Date limite : {new Date(decision.endDate).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {/* Formulaire de vote */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Votre vote</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vote CONSENSUS */}
            {decision.decisionType === 'CONSENSUS' && (
              <div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Proposition :</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {decision.proposal || decision.initialProposal}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="consensus"
                      value="AGREE"
                      checked={consensusVote === 'AGREE'}
                      onChange={() => setConsensusVote('AGREE')}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">D'accord</div>
                      <div className="text-sm text-gray-600">J'approuve cette proposition</div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="consensus"
                      value="DISAGREE"
                      checked={consensusVote === 'DISAGREE'}
                      onChange={() => setConsensusVote('DISAGREE')}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Pas d'accord</div>
                      <div className="text-sm text-gray-600">Je n'approuve pas cette proposition</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Vote MAJORITY */}
            {decision.decisionType === 'MAJORITY' && (
              <div className="space-y-3">
                {decision.proposals.map((proposal) => (
                  <label
                    key={proposal.id}
                    className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="majority"
                      value={proposal.id}
                      checked={majorityVote === proposal.id}
                      onChange={() => setMajorityVote(proposal.id)}
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
            )}

            {/* Vote NUANCED_VOTE */}
            {decision.decisionType === 'NUANCED_VOTE' && decision.nuancedScale && (
              <div className="space-y-6">
                {decision.nuancedProposals.map((proposal) => {
                  const mentions = NUANCED_MENTIONS[decision.nuancedScale as keyof typeof NUANCED_MENTIONS] || [];
                  return (
                    <div key={proposal.id} className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">{proposal.title}</h3>
                      {proposal.description && (
                        <p className="text-sm text-gray-600 mb-3">{proposal.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {mentions.map((mention) => (
                          <button
                            key={mention.value}
                            type="button"
                            onClick={() => setNuancedVotes({ ...nuancedVotes, [proposal.id]: mention.value })}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              nuancedVotes[proposal.id] === mention.value
                                ? mention.color + ' ring-2 ring-offset-2 ring-blue-500'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {mention.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer mon vote'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Vote anonyme et sécurisé</p>
        </div>
      </div>
    </div>
  );
}
