'use client';

import { useEffect, useState } from 'react';
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
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

interface Decision {
  id: string;
  title: string;
  description: string;
  context?: string;
  decisionType: string;
  initialProposal?: string;
  amendedProposal?: string;
  endDate: string;
  proposals?: Proposal[];
  comments?: Comment[];
}

interface Proposal {
  id: string;
  title: string;
  description?: string;
  order: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user?: {
    name: string | null;
  } | null;
  externalParticipant?: {
    externalName: string | null;
  } | null;
  replies?: Comment[];
}

interface Participant {
  id: string;
  name: string;
  hasVoted: boolean;
}

interface ExistingVote {
  id: string;
  value: string;
  comment?: string;
}

interface ExistingProposalVote {
  id: string;
  proposal: Proposal;
}

export default function ExternalVoteClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [existingVote, setExistingVote] = useState<ExistingVote | null>(null);
  const [existingProposalVote, setExistingProposalVote] = useState<ExistingProposalVote | null>(null);
  const [existingComments, setExistingComments] = useState<Comment[]>([]);

  const [selectedProposal, setSelectedProposal] = useState<string>('');
  const [voteValue, setVoteValue] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string>('');

  // Helper pour obtenir le nom de l'auteur d'un commentaire
  const getCommentAuthorName = (comment: Comment): string => {
    if (comment.user?.name) return comment.user.name;
    if (comment.externalParticipant?.externalName) return comment.externalParticipant.externalName;
    return 'Anonyme';
  };

  // Charger les données de la décision
  useEffect(() => {
    const fetchDecision = async () => {
      try {
        const response = await fetch(`/api/vote/${token}`);

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erreur lors du chargement de la décision');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setDecision(data.decision);
        setParticipant(data.participant);
        setExistingVote(data.existingVote);
        setExistingProposalVote(data.existingProposalVote);
        setExistingComments(data.existingComments || []);

        // Pré-remplir le vote existant
        if (data.existingVote) {
          setVoteValue(data.existingVote.value);
        }
        if (data.existingProposalVote) {
          setSelectedProposal(data.existingProposalVote.proposal.id);
        }

        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement de la décision');
        setLoading(false);
      }
    };

    fetchDecision();
  }, [token]);

  // Soumettre le vote
  const handleSubmitVote = async () => {
    if (!decision) return;

    // Validation
    if (decision.decisionType === 'MAJORITY') {
      if (!selectedProposal) {
        setError('Veuillez sélectionner une proposition');
        return;
      }
    } else if (decision.decisionType === 'CONSENSUS') {
      // Pour CONSENSUS, le vote OU le commentaire est requis (ou les deux)
      if (!voteValue && !comment.trim()) {
        setError('Veuillez fournir un vote et/ou un commentaire');
        return;
      }
    } else {
      // Pour les autres types, le vote est requis
      if (!voteValue) {
        setError('Veuillez sélectionner une option de vote');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const body = decision.decisionType === 'MAJORITY'
        ? { proposalId: selectedProposal }
        : { value: voteValue || undefined, comment: comment.trim() || undefined };

      const response = await fetch(`/api/vote/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Erreur lors de l\'enregistrement du vote');
        setSubmitting(false);
        return;
      }

      const data = await response.json();
      setSubmissionMessage(data.message || 'Enregistré avec succès');
      setSubmitted(true);
      setSubmitting(false);
    } catch (err) {
      setError('Erreur lors de l\'enregistrement du vote');
      setSubmitting(false);
    }
  };

  // États de chargement et erreur
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#f5f5f5',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !decision) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#f5f5f5',
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 500 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ErrorIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6">Erreur</Typography>
            </Box>
            <Typography color="text.secondary">{error}</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Confirmation après vote
  if (submitted) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#f5f5f5',
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 500 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircle color="success" sx={{ mr: 1, fontSize: 40 }} />
              <Typography variant="h5">Merci !</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {submissionMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vous pouvez fermer cette page ou utiliser le même lien pour modifier votre participation avant la date limite.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!decision) return null;

  const getDecisionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      CONSENSUS: 'Consensus',
      CONSENT: 'Consentement',
      MAJORITY: 'Vote à la majorité',
      SUPERMAJORITY: 'Super-majorité',
      WEIGHTED_VOTE: 'Vote pondéré',
      ADVISORY: 'Vote consultatif',
    };
    return labels[type] || type;
  };

  const getVoteOptions = () => {
    if (decision.decisionType === 'CONSENSUS') {
      return [
        { value: 'AGREE', label: 'D\'accord' },
        { value: 'DISAGREE', label: 'Pas d\'accord' },
      ];
    }

    // Pour les autres types (CONSENT, WEIGHTED_VOTE, etc.)
    return [
      { value: 'STRONG_SUPPORT', label: 'Soutien fort' },
      { value: 'SUPPORT', label: 'Soutien' },
      { value: 'WEAK_SUPPORT', label: 'Soutien faible' },
      { value: 'ABSTAIN', label: 'Abstention' },
      { value: 'WEAK_OPPOSE', label: 'Opposition faible' },
      { value: 'OPPOSE', label: 'Opposition' },
      { value: 'STRONG_OPPOSE', label: 'Opposition forte' },
      ...(decision.decisionType === 'CONSENT' ? [{ value: 'BLOCK', label: 'Bloquer (objection majeure)' }] : []),
    ];
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* En-tête */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <Chip label={getDecisionTypeLabel(decision.decisionType)} color="primary" />
              <Chip
                label={`Date limite: ${new Date(decision.endDate).toLocaleDateString('fr-FR')}`}
                variant="outlined"
              />
            </Box>
            <Typography variant="h4" gutterBottom>
              {decision.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {decision.description}
            </Typography>

            {decision.context && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Contexte :
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {decision.context}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Proposition initiale et amendée pour CONSENSUS */}
        {decision.decisionType === 'CONSENSUS' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {decision.initialProposal && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Proposition initiale
                  </Typography>
                  <Paper elevation={0} sx={{ bgcolor: '#f9f9f9', p: 2 }}>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                      {decision.initialProposal}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {decision.amendedProposal && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Proposition amendée
                  </Typography>
                  <Paper elevation={0} sx={{ bgcolor: '#e3f2fd', p: 2 }}>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                      {decision.amendedProposal}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Commentaires pour CONSENSUS */}
        {decision.decisionType === 'CONSENSUS' && decision.comments && decision.comments.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Commentaires
              </Typography>
              {decision.comments.map((comment) => (
                <Box key={comment.id} sx={{ mb: 2 }}>
                  <Paper elevation={0} sx={{ bgcolor: '#f9f9f9', p: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                      {comment.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getCommentAuthorName(comment)} • {new Date(comment.createdAt).toLocaleDateString('fr-FR')}
                    </Typography>

                    {comment.replies && comment.replies.length > 0 && (
                      <Box sx={{ ml: 3, mt: 2 }}>
                        {comment.replies.map((reply) => (
                          <Paper key={reply.id} elevation={0} sx={{ bgcolor: 'white', p: 1.5, mb: 1 }}>
                            <Typography variant="body2" sx={{ mb: 0.5, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                              {reply.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getCommentAuthorName(reply)}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Box>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Formulaire de vote */}
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Votre vote
            </Typography>

            {participant?.hasVoted && (existingVote || existingProposalVote) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Vous avez déjà voté. Vous pouvez modifier votre vote ci-dessous.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {decision.decisionType === 'MAJORITY' ? (
              // Vote à la majorité : choix de proposition
              <FormControl component="fieldset" fullWidth>
                <RadioGroup value={selectedProposal} onChange={(e) => setSelectedProposal(e.target.value)}>
                  {decision.proposals?.map((proposal) => (
                    <Paper
                      key={proposal.id}
                      elevation={selectedProposal === proposal.id ? 3 : 0}
                      sx={{
                        p: 2,
                        mb: 2,
                        border: selectedProposal === proposal.id ? 2 : 1,
                        borderColor: selectedProposal === proposal.id ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedProposal(proposal.id)}
                    >
                      <FormControlLabel
                        value={proposal.id}
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {proposal.title}
                            </Typography>
                            {proposal.description && (
                              <Typography variant="body2" color="text.secondary">
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
            ) : (
              // Vote nuancé (CONSENSUS, CONSENT, etc.)
              <>
                {decision.decisionType === 'CONSENSUS' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Vous pouvez voter, commenter, ou faire les deux.
                  </Alert>
                )}

                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mt: 2 }}>
                  {decision.decisionType === 'CONSENSUS' ? 'Votre position (optionnel)' : 'Votre vote'}
                </Typography>
                <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                  <RadioGroup value={voteValue} onChange={(e) => setVoteValue(e.target.value)}>
                    {getVoteOptions().map((option) => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio />}
                        label={option.label}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>

                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                  {decision.decisionType === 'CONSENSUS' ? 'Votre commentaire (optionnel)' : 'Commentaire (optionnel)'}
                </Typography>
                <TextField
                  multiline
                  rows={4}
                  fullWidth
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder={decision.decisionType === 'CONSENSUS'
                    ? "Partagez votre avis, vos questions ou vos suggestions..."
                    : "Ajoutez un commentaire (optionnel)..."
                  }
                />

                {existingComments && existingComments.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Vous avez déjà publié {existingComments.length} commentaire{existingComments.length > 1 ? 's' : ''} sur cette décision.
                    </Typography>
                  </Box>
                )}
              </>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmitVote}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : participant?.hasVoted ? 'Modifier mon vote' : 'Enregistrer mon vote'}
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
