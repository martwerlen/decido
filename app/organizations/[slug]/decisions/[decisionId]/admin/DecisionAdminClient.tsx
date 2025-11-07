'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DecisionStatusLabels, DecisionTypeLabels } from '@/types/enums';

interface Participant {
  id: string;
  userId: string | null;
  externalEmail: string | null;
  externalName: string | null;
  invitedVia: string;
  hasVoted: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  decisionType: string;
  status: string;
  votingMode: string;
  initialProposal: string | null;
  proposal: string | null;
  conclusion: string | null;
  endDate: Date | null;
  participants: Participant[];
}

interface Props {
  decision: Decision;
  slug: string;
  userId: string;
}

export default function DecisionAdminClient({
  decision: initialDecision,
  slug,
  userId,
}: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState(initialDecision);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // État pour la proposition amendée (CONSENSUS)
  const [proposal, setAmendedProposal] = useState(decision.proposal || '');

  // État pour la conclusion
  const [conclusion, setConclusion] = useState(decision.conclusion || '');

  const isOpen = decision.status === 'OPEN';

  // Vérifier si la décision est terminée (pour permettre l'ajout d'une conclusion)
  const now = new Date();
  const isDeadlinePassed = decision.endDate ? new Date(decision.endDate) <= now : false;
  const allParticipantsVoted = decision.participants.every((p) => p.hasVoted);
  const isVotingFinished = isDeadlinePassed || allParticipantsVoted;

  // Calculer combien d'avis ont été donnés (pour ADVICE_SOLICITATION)
  const opinionsReceived = decision.participants.filter(p => p.hasVoted).length;

  // Mettre à jour la proposition amendée (CONSENSUS) ou l'intention (ADVICE_SOLICITATION)
  const handleUpdateProposal = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { decision: updated } = await response.json();
      setDecision({ ...decision, proposal: updated.proposal });
      setSuccess(decision.decisionType === 'CONSENSUS' ? 'Proposition amendée mise à jour' : 'Intention de décision mise à jour');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour la conclusion
  const handleUpdateConclusion = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/conclusion`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conclusion }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { decision: updated } = await response.json();
      setDecision({ ...decision, conclusion: updated.conclusion });
      setSuccess('Conclusion mise à jour');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Retirer la décision
  const handleWithdrawDecision = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/withdraw`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { decision: updated } = await response.json();
      setDecision({ ...decision, status: updated.status, result: updated.result });
      setSuccess('Décision retirée avec succès');
      setTimeout(() => {
        router.push(`/organizations/${slug}/decisions/${decision.id}/results`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Valider la décision finale (ADVICE_SOLICITATION)
  const handleValidateFinalDecision = async () => {
    if (!conclusion || conclusion.trim() === '') {
      setError('Vous devez rédiger une décision finale avant de valider');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/validate`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conclusion }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { decision: updated } = await response.json();
      setDecision({ ...decision, status: updated.status, result: updated.result, conclusion: updated.conclusion });
      setSuccess('Décision finale validée avec succès');
      setTimeout(() => {
        router.push(`/organizations/${slug}/decisions/${decision.id}/results`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{decision.title}</h1>
        <p className="text-sm text-gray-600 mt-2">{decision.description}</p>
        <div className="flex gap-2 mt-4">
          <span className="bg-gray-100 px-3 py-1 rounded text-sm">
            {DecisionStatusLabels[decision.status as keyof typeof DecisionStatusLabels]}
          </span>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
            {DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
          </span>
        </div>
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

      {/* Section Proposition amendée (CONSENSUS) */}
      {decision.decisionType === 'CONSENSUS' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold mb-4">Propositions</h2>

          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Proposition initiale</h3>
            <div className="p-4 bg-gray-50 rounded border">
              {decision.initialProposal}
            </div>
          </div>

          {(isOpen || decision.proposal) && (
            <div>
              <h3 className="text-sm font-medium mb-2">Proposition amendée</h3>
              {isOpen ? (
                <div className="space-y-3">
                  <textarea
                    value={proposal}
                    onChange={(e) => setAmendedProposal(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Vous pouvez amender la proposition pendant que le vote est ouvert..."
                  />
                  <button
                    onClick={handleUpdateProposal}
                    disabled={loading}
                    className="text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)')}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                  >
                    Mettre à jour la proposition amendée
                  </button>
                </div>
              ) : decision.proposal ? (
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  {decision.proposal}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Aucune proposition amendée</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section Intention de décision (ADVICE_SOLICITATION) */}
      {decision.decisionType === 'ADVICE_SOLICITATION' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold mb-4">Intention de décision</h2>

          {isOpen && opinionsReceived === 0 && (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
              ⚠️ Vous pouvez modifier votre intention uniquement tant qu'aucun avis n'a été donné.
            </p>
          )}

          <div className="space-y-3">
            <textarea
              value={proposal}
              onChange={(e) => setAmendedProposal(e.target.value)}
              rows={6}
              disabled={opinionsReceived > 0}
              className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Intention de décision..."
            />

            {isOpen && opinionsReceived === 0 && (
              <button
                onClick={handleUpdateProposal}
                disabled={loading}
                className="text-white px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)')}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour l\'intention'}
              </button>
            )}

            {isOpen && opinionsReceived > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                ℹ️ Des avis ont déjà été donnés. Vous ne pouvez plus modifier votre intention de décision.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Participants */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">
          {decision.decisionType === 'ADVICE_SOLICITATION'
            ? `Personnes sollicitées pour avis (${decision.participants.length})`
            : `Participants (${decision.participants.length})`}
        </h2>

        {decision.participants.length > 0 && (
          <div className="space-y-2">
            {decision.participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 border rounded text-sm">
                <div className="flex-1">
                  {participant.user ? (
                    <div>
                      <span className="font-medium">{participant.user.name || 'Sans nom'}</span>
                      <span className="text-sm text-gray-600 ml-2 hidden sm:inline">({participant.user.email})</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium">{participant.externalName}</span>
                      <span className="text-sm text-gray-600 ml-2 hidden sm:inline">
                        ({participant.externalEmail}) - Externe
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {participant.hasVoted ? (
                    <span className="text-sm text-green-600">✓ A {decision.decisionType === 'ADVICE_SOLICITATION' ? 'donné son avis' : 'voté'}</span>
                  ) : (
                    <span className="text-sm text-gray-500">⏰ En attente</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section Conclusion/Décision finale */}
      {decision.decisionType === 'ADVICE_SOLICITATION' && isOpen && opinionsReceived === decision.participants.length && decision.participants.length > 0 ? (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold mb-4">Décision finale</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tous les avis ont été reçus. Rédigez maintenant votre décision finale en tenant compte des avis sollicités.
          </p>
          <div className="space-y-3">
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Rédigez votre décision finale ici..."
            />
          </div>
        </div>
      ) : decision.decisionType !== 'ADVICE_SOLICITATION' && isVotingFinished ? (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold mb-4">Conclusion</h2>
          <p className="text-sm text-gray-600 mb-4">
            Rédigez une conclusion pour cette décision. Elle apparaîtra à la fin de la page de résultats.
          </p>
          <div className="space-y-3">
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Entrez votre conclusion ici..."
            />
            <button
              onClick={handleUpdateConclusion}
              disabled={loading}
              className="text-white px-4 py-2 rounded-lg disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
            >
              Enregistrer la conclusion
            </button>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => router.push(`/organizations/${slug}`)}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Retour
        </button>

        {isOpen && (
          <>
            {/* Bouton "Voir la décision en cours" / "Voir le vote" */}
            <button
              onClick={() => router.push(`/organizations/${slug}/decisions/${decision.id}/vote`)}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-primary)';
              }}
            >
              {decision.decisionType === 'CONSENSUS' || decision.decisionType === 'ADVICE_SOLICITATION'
                ? 'Voir la décision en cours'
                : 'Voir le vote'}
            </button>

            {/* Bouton "Retirer la décision" */}
            <button
              onClick={handleWithdrawDecision}
              disabled={loading}
              className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Retrait...' : 'Retirer la décision'}
            </button>

            {/* Bouton "Valider la décision finale" (ADVICE_SOLICITATION uniquement) */}
            {decision.decisionType === 'ADVICE_SOLICITATION' && opinionsReceived === decision.participants.length && decision.participants.length > 0 && (
              <button
                onClick={handleValidateFinalDecision}
                disabled={loading || !conclusion || conclusion.trim() === ''}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Validation...' : 'Valider la décision finale'}
              </button>
            )}
          </>
        )}
      </div>

      {isOpen && decision.decisionType === 'ADVICE_SOLICITATION' && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Statut de la sollicitation d'avis :</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• {opinionsReceived} avis reçu{opinionsReceived > 1 ? 's' : ''} sur {decision.participants.length} sollicité{decision.participants.length > 1 ? 's' : ''}</li>
            {opinionsReceived < decision.participants.length && (
              <li>• En attente de {decision.participants.length - opinionsReceived} avis supplémentaire{decision.participants.length - opinionsReceived > 1 ? 's' : ''}</li>
            )}
            {opinionsReceived === decision.participants.length && decision.participants.length > 0 && (
              <li className="text-green-700">✓ Tous les avis ont été reçus ! Vous pouvez maintenant valider votre décision finale.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
