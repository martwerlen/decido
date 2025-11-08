'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Chip, Typography, Button, Alert } from '@mui/material';
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
  result: string | null;
  decidedAt: Date | null;
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
      <Box sx={{ mb: 3 }}>
        <h1 className="text-2xl font-bold">{decision.title}</h1>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{decision.description}</Typography>
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

      {/* Section Proposition amendée (CONSENSUS) */}
      {decision.decisionType === 'CONSENSUS' && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
          <h2 className="text-base font-semibold mb-4">Propositions</h2>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Proposition initiale</Typography>
            <Box sx={{ p: 2, backgroundColor: 'background.secondary', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              {decision.initialProposal}
            </Box>
          </Box>

          {(isOpen || decision.proposal) && (
            <div>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Proposition amendée</Typography>
              {isOpen ? (
                <div className="space-y-3">
                  <textarea
                    value={proposal}
                    onChange={(e) => setAmendedProposal(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Vous pouvez amender la proposition pendant que le vote est ouvert..."
                  />
                  <Button
                    onClick={handleUpdateProposal}
                    disabled={loading}
                    variant="contained"
                    color="primary"
                  >
                    Mettre à jour la proposition amendée
                  </Button>
                </div>
              ) : decision.proposal ? (
                <Box sx={{ p: 2, backgroundColor: 'primary.light', borderRadius: 1, border: 1, borderColor: 'primary.main' }}>
                  {decision.proposal}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Aucune proposition amendée</Typography>
              )}
            </div>
          )}
        </Box>
      )}

      {/* Section Intention de décision (ADVICE_SOLICITATION) */}
      {decision.decisionType === 'ADVICE_SOLICITATION' && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
          <h2 className="text-base font-semibold mb-4">Intention de décision</h2>

          {isOpen && opinionsReceived === 0 && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              ⚠️ Vous pouvez modifier votre intention uniquement tant qu'aucun avis n'a été donné.
            </Alert>
          )}

          <div className="space-y-3">
            <textarea
              value={proposal}
              onChange={(e) => setAmendedProposal(e.target.value)}
              rows={6}
              disabled={opinionsReceived > 0}
              className="w-full px-3 py-2 border rounded-lg disabled:cursor-not-allowed"
              placeholder="Intention de décision..."
            />

            {isOpen && opinionsReceived === 0 && (
              <Button
                onClick={handleUpdateProposal}
                disabled={loading}
                variant="contained"
                color="primary"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour l\'intention'}
              </Button>
            )}

            {isOpen && opinionsReceived > 0 && (
              <Alert severity="info" icon="ℹ️">
                Des avis ont déjà été donnés. Vous ne pouvez plus modifier votre intention de décision.
              </Alert>
            )}
          </div>
        </Box>
      )}

      {/* Section Participants */}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
        <h2 className="text-base font-semibold mb-4">
          {decision.decisionType === 'ADVICE_SOLICITATION'
            ? `Personnes sollicitées pour avis (${decision.participants.length})`
            : `Participants (${decision.participants.length})`}
        </h2>

        {decision.participants.length > 0 && (
          <div className="space-y-2">
            {decision.participants.map((participant) => (
              <Box key={participant.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <div className="flex-1">
                  {participant.user ? (
                    <div>
                      <span className="font-medium">{participant.user.name || 'Sans nom'}</span>
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, display: { xs: 'none', sm: 'inline' } }}>
                        ({participant.user.email})
                      </Typography>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium">{participant.externalName}</span>
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, display: { xs: 'none', sm: 'inline' } }}>
                        ({participant.externalEmail}) - Externe
                      </Typography>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {participant.hasVoted ? (
                    <Typography variant="body2" color="success.main">✓ A {decision.decisionType === 'ADVICE_SOLICITATION' ? 'donné son avis' : 'voté'}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">⏰ En attente</Typography>
                  )}
                </div>
              </Box>
            ))}
          </div>
        )}
      </Box>

      {/* Section Conclusion/Décision finale */}
      {decision.decisionType === 'ADVICE_SOLICITATION' && isOpen && opinionsReceived === decision.participants.length && decision.participants.length > 0 ? (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
          <h2 className="text-base font-semibold mb-4">Décision finale</h2>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tous les avis ont été reçus. Rédigez maintenant votre décision finale en tenant compte des avis sollicités.
          </Typography>
          <div className="space-y-3">
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Rédigez votre décision finale ici..."
            />
          </div>
        </Box>
      ) : decision.decisionType !== 'ADVICE_SOLICITATION' && isVotingFinished ? (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
          <h2 className="text-base font-semibold mb-4">Conclusion</h2>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rédigez une conclusion pour cette décision. Elle apparaîtra à la fin de la page de résultats.
          </Typography>
          <div className="space-y-3">
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Entrez votre conclusion ici..."
            />
            <Button
              onClick={handleUpdateConclusion}
              disabled={loading}
              variant="contained"
              color="primary"
            >
              Enregistrer la conclusion
            </Button>
          </div>
        </Box>
      ) : null}

      {/* Actions */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Button
          onClick={() => router.push(`/organizations/${slug}`)}
          variant="outlined"
        >
          Retour
        </Button>

        {isOpen && (
          <>
            {/* Bouton "Voir la décision en cours" / "Voir le vote" */}
            <Button
              onClick={() => router.push(`/organizations/${slug}/decisions/${decision.id}/vote`)}
              variant="outlined"
              color="primary"
            >
              {decision.decisionType === 'CONSENSUS' || decision.decisionType === 'ADVICE_SOLICITATION'
                ? 'Voir la décision en cours'
                : 'Voir le vote'}
            </Button>

            {/* Bouton "Retirer la décision" */}
            <Button
              onClick={handleWithdrawDecision}
              disabled={loading}
              variant="outlined"
              color="error"
            >
              {loading ? 'Retrait...' : 'Retirer la décision'}
            </Button>

            {/* Bouton "Valider la décision finale" (ADVICE_SOLICITATION uniquement) */}
            {decision.decisionType === 'ADVICE_SOLICITATION' && opinionsReceived === decision.participants.length && decision.participants.length > 0 && (
              <Button
                onClick={handleValidateFinalDecision}
                disabled={loading || !conclusion || conclusion.trim() === ''}
                variant="contained"
                color="success"
              >
                {loading ? 'Validation...' : 'Valider la décision finale'}
              </Button>
            )}
          </>
        )}
      </Box>

      {isOpen && decision.decisionType === 'ADVICE_SOLICITATION' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="medium" gutterBottom>Statut de la sollicitation d'avis :</Typography>
          <ul className="text-sm space-y-1">
            <li>• {opinionsReceived} avis reçu{opinionsReceived > 1 ? 's' : ''} sur {decision.participants.length} sollicité{decision.participants.length > 1 ? 's' : ''}</li>
            {opinionsReceived < decision.participants.length && (
              <li>• En attente de {decision.participants.length - opinionsReceived} avis supplémentaire{decision.participants.length - opinionsReceived > 1 ? 's' : ''}</li>
            )}
            {opinionsReceived === decision.participants.length && decision.participants.length > 0 && (
              <Typography component="li" color="success.main">✓ Tous les avis ont été reçus ! Vous pouvez maintenant valider votre décision finale.</Typography>
            )}
          </ul>
        </Alert>
      )}
    </div>
  );
}
