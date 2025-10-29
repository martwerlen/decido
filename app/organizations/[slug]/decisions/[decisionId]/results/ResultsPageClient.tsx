'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DecisionStatusLabels, DecisionTypeLabels, DecisionResultLabels } from '@/types/enums';
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
  comments: Comment[];
  participants: any[];
}

interface Props {
  decision: Decision;
  proposalResults: ProposalResult[];
  agreeCount: number;
  disagreeCount: number;
  consensusReached: boolean;
  slug: string;
  isCreator: boolean;
}

export default function ResultsPageClient({
  decision,
  proposalResults,
  agreeCount,
  disagreeCount,
  consensusReached,
  slug,
  isCreator,
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
          {decision.result && (
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${
                decision.result === 'APPROVED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {DecisionResultLabels[decision.result as keyof typeof DecisionResultLabels]}
            </span>
          )}
        </div>
        {decision.decidedAt && (
          <p className="text-sm text-gray-600 mt-2">
            Décision prise le {new Date(decision.decidedAt).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* Résultats vote à la majorité */}
      {decision.decisionType === 'MAJORITY' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Résultats du vote</h2>

          <div className="mb-6">
            <p className="text-gray-600">
              {totalVotes} vote{totalVotes > 1 ? 's' : ''} sur {decision.participants.length} participant{decision.participants.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-4">
            {proposalResults.map((result, index) => (
              <div
                key={result.proposal.id}
                className={`border-2 rounded-lg p-4 ${
                  result.isWinner
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {index + 1}. {result.proposal.title}
                      </span>
                      {result.isWinner && (
                        <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                          GAGNANT
                        </span>
                      )}
                    </div>
                    {result.proposal.description && (
                      <p className="text-sm text-gray-600 mt-1">{result.proposal.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold">{result.voteCount}</div>
                    <div className="text-sm text-gray-600">
                      {result.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      result.isWinner ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${result.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {decision.status === 'OPEN' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                Le vote est toujours en cours. Ces résultats peuvent encore évoluer.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Résultats consensus */}
      {decision.decisionType === 'CONSENSUS' && (
        <>
          {/* Proposition finale */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Proposition</h2>

            {decision.initialProposal && decision.proposal && decision.initialProposal !== decision.proposal ? (
              <div>
                <h3 className="font-medium text-blue-700 mb-2">Proposition actuelle</h3>
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="whitespace-pre-wrap">{decision.proposal}</p>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Voir la proposition initiale
                  </summary>
                  <div className="p-4 bg-gray-50 rounded border mt-2">
                    <p className="whitespace-pre-wrap">{decision.initialProposal}</p>
                  </div>
                </details>
              </div>
            ) : (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Proposition</h3>
                <div className="p-4 bg-gray-50 rounded border">
                  <p className="whitespace-pre-wrap">{decision.proposal || decision.initialProposal}</p>
                </div>
              </div>
            )}
          </div>

          {/* Discussion */}
          {decision.comments.length > 0 && (
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Historique de la discussion</h2>

              <div className="space-y-4">
                {decision.comments.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{comment.user?.name || 'Anonyme'}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString('fr-FR')}
                        {new Date(comment.updatedAt) > new Date(comment.createdAt) && ' (modifié)'}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Résultat du vote */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Résultat du vote</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-700">{agreeCount}</div>
                <div className="text-sm text-green-600">D'accord</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-700">{disagreeCount}</div>
                <div className="text-sm text-red-600">Pas d'accord</div>
              </div>
            </div>

            <div className="text-center">
              {consensusReached ? (
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                  <div className="text-lg font-semibold text-green-800 mb-1">
                    ✓ Consensus atteint
                  </div>
                  <p className="text-sm text-green-700">
                    Tous les participants sont d'accord avec la proposition
                  </p>
                </div>
              ) : (
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                  <div className="text-lg font-semibold text-orange-800 mb-1">
                    Consensus non atteint
                  </div>
                  <p className="text-sm text-orange-700">
                    {disagreeCount} participant{disagreeCount > 1 ? 's ne sont' : ' n\'est'} pas d'accord
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              {totalConsensusVotes} vote{totalConsensusVotes > 1 ? 's' : ''} sur {decision.participants.length} participant{decision.participants.length > 1 ? 's' : ''}
            </div>

            {decision.status === 'OPEN' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  Le vote est toujours en cours. Le consensus pourra être atteint si tous les participants votent "d'accord".
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Détails du résultat */}
      {decision.resultDetails && (
        <div className="bg-gray-50 border rounded-lg p-6 mb-6">
          <h3 className="font-medium mb-2">Détails</h3>
          <p className="text-gray-700">{decision.resultDetails}</p>
        </div>
      )}

      {/* Conclusion */}
      {decision.conclusion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Conclusion</h2>
          <div className="prose max-w-none text-gray-800">
            <p className="whitespace-pre-wrap">{decision.conclusion}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <Link
          href={`/organizations/${slug}/decisions`}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Retour aux décisions
        </Link>
        {decision.status === 'OPEN' && (
          <Link
            href={`/organizations/${slug}/decisions/${decision.id}/vote`}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour au vote
          </Link>
        )}
        {isCreator && (
          <Link
            href={`/organizations/${slug}/decisions/${decision.id}/admin`}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Administrer
          </Link>
        )}
      </div>
    </div>
  );
}
