'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Alert,
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import {
  getMentionsForScale,
  getMentionLabel,
  getMentionColor,
  NuancedScaleLabels,
} from '@/types/enums';

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
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'success.light',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <CheckCircle color="success" sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Vote enregistré !
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Merci pour votre participation. Votre vote a été enregistré avec succès.
            </Typography>
            <Button
              onClick={() => setSubmitted(false)}
              color="primary"
              sx={{ mt: 2 }}
            >
              Modifier mon vote
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        {/* En-tête */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              {decision.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {decision.description}
            </Typography>
            {decision.endDate && (
              <Typography variant="body2" color="text.secondary">
                Date limite : {new Date(decision.endDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Formulaire de vote */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="600">
              Votre vote
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              {/* Vote CONSENSUS */}
              {decision.decisionType === 'CONSENSUS' && (
                <Box sx={{ mb: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 3,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                      Proposition :
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {decision.proposal || decision.initialProposal}
                    </Typography>
                  </Paper>

                  <FormControl component="fieldset" fullWidth>
                    <RadioGroup
                      value={consensusVote || ''}
                      onChange={(e) => setConsensusVote(e.target.value as 'AGREE' | 'DISAGREE')}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          mb: 2,
                          border: 2,
                          borderColor: consensusVote === 'AGREE' ? 'primary.main' : 'divider',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => setConsensusVote('AGREE')}
                      >
                        <FormControlLabel
                          value="AGREE"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1" fontWeight="500">
                                D'accord
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                J'approuve cette proposition
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>

                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          border: 2,
                          borderColor: consensusVote === 'DISAGREE' ? 'primary.main' : 'divider',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => setConsensusVote('DISAGREE')}
                      >
                        <FormControlLabel
                          value="DISAGREE"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1" fontWeight="500">
                                Pas d'accord
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Je n'approuve pas cette proposition
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </RadioGroup>
                  </FormControl>
                </Box>
              )}

              {/* Vote MAJORITY */}
              {decision.decisionType === 'MAJORITY' && (
                <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                  <RadioGroup
                    value={majorityVote || ''}
                    onChange={(e) => setMajorityVote(e.target.value)}
                  >
                    {decision.proposals.map((proposal) => (
                      <Paper
                        key={proposal.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          mb: 2,
                          border: 2,
                          borderColor: majorityVote === proposal.id ? 'primary.main' : 'divider',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => setMajorityVote(proposal.id)}
                      >
                        <FormControlLabel
                          value={proposal.id}
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1" fontWeight="500">
                                {proposal.title}
                              </Typography>
                              {proposal.description && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {proposal.description}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </Paper>
                    ))}
                  </RadioGroup>
                </FormControl>
              )}

              {/* Vote NUANCED_VOTE */}
              {decision.decisionType === 'NUANCED_VOTE' && decision.nuancedScale && (
                <Box sx={{ mb: 3 }}>
                  {decision.nuancedProposals.map((proposal) => {
                    const mentionValues = getMentionsForScale(decision.nuancedScale || '5_LEVELS');
                    return (
                      <Paper
                        key={proposal.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          mb: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                          {proposal.title}
                        </Typography>
                        {proposal.description && (
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {proposal.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {mentionValues.map((mentionValue) => {
                            const label = getMentionLabel(decision.nuancedScale || '5_LEVELS', mentionValue);
                            const color = getMentionColor(decision.nuancedScale || '5_LEVELS', mentionValue);
                            const isSelected = nuancedVotes[proposal.id] === mentionValue;

                            return (
                              <Chip
                                key={mentionValue}
                                label={label}
                                variant={isSelected ? 'filled' : 'outlined'}
                                onClick={() =>
                                  setNuancedVotes({ ...nuancedVotes, [proposal.id]: mentionValue })
                                }
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: isSelected ? color : 'transparent',
                                  borderColor: color,
                                  color: isSelected ? '#fff' : color,
                                  fontWeight: isSelected ? 600 : 400,
                                  '&:hover': {
                                    backgroundColor: isSelected ? color : `${color}22`,
                                    opacity: 0.9,
                                  },
                                }}
                              />
                            );
                          })}
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer mon vote'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Vote anonyme et sécurisé
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
