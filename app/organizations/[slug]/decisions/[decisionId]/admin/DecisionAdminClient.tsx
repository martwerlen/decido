'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DecisionStatusLabels, DecisionTypeLabels } from '@/types/enums';
import { Button, Card, TextField, Typography, Box, Chip, Alert } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

interface Participant {
  id: string;
  userId: string | null;
  externalEmail: string | null;
  externalName: string | null;
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

  // État pour la proposition amendée (CONSENSUS et ADVICE_SOLICITATION)
  const [proposal, setProposal] = useState(decision.proposal || decision.initialProposal || '');

  // État pour la conclusion
  const [conclusion, setConclusion] = useState(decision.conclusion || '');

  const isOpen = decision.status === 'OPEN';
  const isClosed = decision.status === 'CLOSED';

  // Vérifier si la décision est terminée (pour permettre l'ajout d'une conclusion)
  const now = new Date();
  const isDeadlinePassed = decision.endDate ? new Date(decision.endDate) <= now : false;
  const allParticipantsVoted = decision.participants.every((p) => p.hasVoted);
  const isVotingFinished = isDeadlinePassed || allParticipantsVoted;

  // Calculer combien d'avis ont été donnés (pour ADVICE_SOLICITATION)
  const opinionsReceived = decision.participants.filter((p) => p.hasVoted).length;
  const canModifyProposal = opinionsReceived === 0;

  // Mettre à jour la proposition (CONSENSUS ou ADVICE_SOLICITATION)
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
      setSuccess('Proposition mise à jour avec succès');
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
      setSuccess('Conclusion mise à jour avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Retirer la décision
  const handleWithdrawDecision = async () => {
    if (!confirm('Voulez-vous vraiment retirer cette décision ? Cette action est irréversible.')) {
      return;
    }

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

    if (!confirm('Voulez-vous vraiment valider la décision finale ? Cette action clôturera définitivement la décision.')) {
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
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {decision.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {decision.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={DecisionStatusLabels[decision.status as keyof typeof DecisionStatusLabels]}
            size="small"
          />
          <Chip
            label={DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
            color="primary"
            size="small"
          />
        </Box>
      </Box>

      {/* Messages d'erreur et succès */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Section Proposition amendée - CONSENSUS */}
      {decision.decisionType === 'CONSENSUS' && (
        <Card sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Propositions
          </Typography>

          {/* Proposition initiale */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Proposition initiale
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
              <Typography variant="body2">
                {decision.initialProposal}
              </Typography>
            </Box>
          </Box>

          {/* Proposition amendée */}
          {isOpen && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Proposition amendée
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Vous pouvez amender la proposition pendant que le vote est ouvert..."
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                onClick={handleUpdateProposal}
                disabled={loading}
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour la proposition'}
              </Button>
            </Box>
          )}

          {!isOpen && decision.proposal && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Proposition amendée
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                <Typography variant="body2">
                  {decision.proposal}
                </Typography>
              </Box>
            </Box>
          )}
        </Card>
      )}

      {/* Section Proposition - ADVICE_SOLICITATION */}
      {decision.decisionType === 'ADVICE_SOLICITATION' && isOpen && (
        <Card sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Proposition de décision
          </Typography>

          {canModifyProposal && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              ⚠️ Vous pouvez modifier votre proposition uniquement tant qu'aucun avis n'a été donné.
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={6}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            disabled={!canModifyProposal}
            placeholder="Proposition de décision..."
            sx={{ mb: 2 }}
          />

          {canModifyProposal ? (
            <Button
              variant="contained"
              onClick={handleUpdateProposal}
              disabled={loading}
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour la proposition'}
            </Button>
          ) : (
            <Alert severity="info">
              ℹ️ Des avis ont déjà été donnés. Vous ne pouvez plus modifier votre proposition de décision.
            </Alert>
          )}
        </Card>
      )}

      {/* Section Participants */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {decision.decisionType === 'ADVICE_SOLICITATION'
            ? `Personnes sollicitées pour avis (${decision.participants.length})`
            : `Participants (${decision.participants.length})`}
        </Typography>

        {decision.participants.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {decision.participants.map((participant) => (
              <Box
                key={participant.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                }}
              >
                <Box>
                  {participant.user ? (
                    <>
                      <Typography variant="body1" component="span" fontWeight="medium">
                        {participant.user.name || 'Sans nom'}
                      </Typography>
                      <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 1 }}>
                        ({participant.user.email})
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="body1" component="span" fontWeight="medium">
                        {participant.externalName}
                      </Typography>
                      <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 1 }}>
                        ({participant.externalEmail}) - Externe
                      </Typography>
                    </>
                  )}
                </Box>
                {participant.hasVoted && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={decision.decisionType === 'ADVICE_SOLICITATION' ? 'Avis donné' : 'A voté'}
                    color="success"
                    size="small"
                  />
                )}
                {!participant.hasVoted && (
                  <Chip
                    icon={<AccessTimeIcon />}
                    label="En attente"
                    color="warning"
                    size="small"
                  />
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aucun participant
          </Typography>
        )}

        {decision.decisionType === 'ADVICE_SOLICITATION' && isOpen && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {opinionsReceived} avis reçu{opinionsReceived > 1 ? 's' : ''} sur {decision.participants.length} sollicité{decision.participants.length > 1 ? 's' : ''}
          </Alert>
        )}
      </Card>

      {/* Section Conclusion (pour décisions terminées) */}
      {decision.decisionType === 'ADVICE_SOLICITATION' && isOpen && opinionsReceived === decision.participants.length && decision.participants.length > 0 && (
        <Card sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Décision finale
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tous les avis ont été reçus. Rédigez maintenant votre décision finale en tenant compte des avis sollicités.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Rédigez votre décision finale ici..."
          />
        </Card>
      )}

      {decision.decisionType !== 'ADVICE_SOLICITATION' && (isVotingFinished || isClosed) && (
        <Card sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Conclusion
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rédigez une conclusion pour cette décision. Elle apparaîtra à la fin de la page de résultats.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Entrez votre conclusion ici..."
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleUpdateConclusion}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer la conclusion'}
          </Button>
        </Card>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          onClick={() => router.push(`/organizations/${slug}/decisions`)}
        >
          Retour
        </Button>

        {/* Bouton "Voir la décision en cours" - CONSENSUS et ADVICE_SOLICITATION */}
        {isOpen && (decision.decisionType === 'CONSENSUS' || decision.decisionType === 'ADVICE_SOLICITATION') && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<VisibilityIcon />}
            onClick={() => router.push(`/organizations/${slug}/decisions/${decision.id}/vote`)}
          >
            Voir la décision en cours
          </Button>
        )}

        {/* Bouton "Voir le vote" - MAJORITY et NUANCED_VOTE */}
        {isOpen && (decision.decisionType === 'MAJORITY' || decision.decisionType === 'NUANCED_VOTE') && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<VisibilityIcon />}
            onClick={() => router.push(`/organizations/${slug}/decisions/${decision.id}/vote`)}
          >
            Voir le vote
          </Button>
        )}

        {/* Bouton "Retirer la décision" */}
        {isOpen && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={handleWithdrawDecision}
            disabled={loading}
          >
            {loading ? 'Retrait...' : 'Retirer la décision'}
          </Button>
        )}

        {/* Bouton "Valider la décision finale" - ADVICE_SOLICITATION */}
        {decision.decisionType === 'ADVICE_SOLICITATION' && isOpen && opinionsReceived === decision.participants.length && decision.participants.length > 0 && (
          <Button
            variant="contained"
            color="success"
            onClick={handleValidateFinalDecision}
            disabled={loading || !conclusion || conclusion.trim() === ''}
          >
            {loading ? 'Validation...' : 'Valider la décision finale'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
