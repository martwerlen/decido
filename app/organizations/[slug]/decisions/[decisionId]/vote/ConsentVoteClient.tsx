'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Chip,
  Typography,
  Button,
  Alert,
  TextField,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Radio,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { AccessTime, CheckCircle, Info, QuestionAnswer, Comment } from '@mui/icons-material';
import { ConsentStage, ConsentStepMode } from '@/types/enums';
import { calculateConsentStageTimings, getCurrentConsentStage } from '@/lib/consent-logic';
import HistoryButton from '@/components/decisions/HistoryButton';
import HistoryPanel from '@/components/decisions/HistoryPanel';

interface ClarificationQuestion {
  id: string;
  questionText: string;
  answerText: string | null;
  questioner: { id: string; name: string | null; email: string } | null;
  answerer: { id: string; name: string | null } | null;
  createdAt: Date;
  answeredAt: Date | null;
}

interface ConsentObjection {
  id: string;
  status: string;
  objectionText: string | null;
  user: { id: string; name: string | null; email: string } | null;
  withdrawnAt: Date | null;
  createdAt: Date;
}

interface OpinionResponse {
  id: string;
  content: string;
  user: { id: string; name: string | null; email: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  initialProposal: string | null;
  proposal: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  consentStepMode: string | null;
  consentCurrentStage: string | null;
  consentAmendmentAction: string | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  participants: any[];
  comments: any[];
}

interface Props {
  decision: Decision;
  clarificationQuestions: ClarificationQuestion[] | null;
  userObjection: ConsentObjection | null;
  allObjections: ConsentObjection[] | null;
  slug: string;
  userId: string;
  isCreator: boolean;
}

export default function ConsentVoteClient({
  decision,
  clarificationQuestions: initialQuestions,
  userObjection: initialUserObjection,
  allObjections: initialAllObjections,
  slug,
  userId,
  isCreator,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  // Tabs pour Questions/Avis
  const [activeTab, setActiveTab] = useState(0);

  // Questions de clarification
  const [questions, setQuestions] = useState<ClarificationQuestion[]>(initialQuestions || []);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);

  // Avis (opinions)
  const [opinions, setOpinions] = useState<OpinionResponse[]>([]);
  const [userOpinion, setUserOpinion] = useState<OpinionResponse | null>(null);
  const [newOpinion, setNewOpinion] = useState('');

  // Objections
  const [objections, setObjections] = useState<ConsentObjection[]>(initialAllObjections || []);
  const [userObjection, setUserObjection] = useState<ConsentObjection | null>(initialUserObjection);
  const [objectionStatus, setObjectionStatus] = useState(initialUserObjection?.status || 'NO_POSITION');
  const [objectionText, setObjectionText] = useState(initialUserObjection?.objectionText || '');

  // Amendements (créateur seulement)
  const [amendedProposal, setAmendedProposal] = useState(decision.proposal || decision.initialProposal || '');

  // Calculer le stade actuel et les timings
  const currentStage = decision.consentCurrentStage as ConsentStage || 'CLARIFICATIONS';
  const stepMode = decision.consentStepMode as ConsentStepMode || 'DISTINCT';

  const timings = decision.startDate && decision.endDate
    ? calculateConsentStageTimings(new Date(decision.startDate), new Date(decision.endDate), stepMode)
    : null;

  const isParticipant = decision.participants.some(p => p.userId === userId);

  // Charger les avis au montage du composant
  useEffect(() => {
    const fetchOpinions = async () => {
      try {
        const response = await fetch(
          `/api/organizations/${slug}/decisions/${decision.id}/opinions`
        );
        if (response.ok) {
          const data = await response.json();
          setOpinions(data.opinions || []);

          // Trouver l'avis de l'utilisateur courant
          const myOpinion = data.opinions?.find((o: OpinionResponse) => o.user?.id === userId);
          if (myOpinion) {
            setUserOpinion(myOpinion);
            setNewOpinion(myOpinion.content);
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement des avis:', err);
      }
    };

    if (currentStage === 'CLARIFICATIONS' || currentStage === 'CLARIFAVIS' || currentStage === 'AVIS') {
      fetchOpinions();
    }
  }, [slug, decision.id, userId, currentStage]);

  // Déterminer les étapes pour le stepper
  const steps = stepMode === 'MERGED'
    ? ['Clarifications & Avis', 'Amendements', 'Objections', 'Conclusion']
    : ['Clarifications', 'Avis', 'Amendements', 'Objections', 'Conclusion'];

  const getActiveStep = () => {
    if (currentStage === 'TERMINEE') return steps.length;
    if (currentStage === 'OBJECTIONS') return steps.length - 2;
    if (currentStage === 'AMENDEMENTS') return stepMode === 'MERGED' ? 1 : 2;
    if (currentStage === 'AVIS') return 1;
    if (currentStage === 'CLARIFAVIS') return 0;
    return 0; // CLARIFICATIONS
  };

  // Fonction pour soumettre une question
  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) {
      setError('Veuillez entrer une question');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/clarifications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionText: newQuestion }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'envoi de la question');
      }

      const data = await response.json();
      setQuestions([...questions, data.question]);
      setNewQuestion('');
      setSuccess('Question envoyée avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour répondre à une question (créateur seulement)
  const handleAnswerQuestion = async (questionId: string) => {
    if (!newAnswer.trim()) {
      setError('Veuillez entrer une réponse');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/clarifications/${questionId}/answer`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answerText: newAnswer }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'envoi de la réponse');
      }

      const data = await response.json();
      setQuestions(questions.map(q => q.id === questionId ? data.question : q));
      setNewAnswer('');
      setAnsweringQuestionId(null);
      setSuccess('Réponse envoyée avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour soumettre ou modifier un avis
  const handleSubmitOpinion = async () => {
    if (!newOpinion.trim()) {
      setError('Veuillez entrer votre avis');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/opinions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newOpinion }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'enregistrement de l\'avis');
      }

      const data = await response.json();
      setUserOpinion(data.opinion);

      // Rafraîchir la liste des avis
      const opResponse = await fetch(`/api/organizations/${slug}/decisions/${decision.id}/opinions`);
      if (opResponse.ok) {
        const opData = await opResponse.json();
        setOpinions(opData.opinions);
      }

      setSuccess(data.isUpdate ? 'Avis modifié avec succès' : 'Avis enregistré avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour amender la proposition
  const handleAmendProposal = async () => {
    if (!amendedProposal.trim()) {
      setError('La proposition ne peut pas être vide');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/consent-amend`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amendedProposal }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'amendement');
      }

      setSuccess('Proposition amendée avec succès. Passage au stade Objections.');
      setTimeout(() => router.refresh(), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour garder la proposition initiale
  const handleKeepProposal = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/consent-keep`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur');
      }

      setSuccess('Proposition conservée. Passage au stade Objections.');
      setTimeout(() => router.refresh(), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour retirer la proposition
  const handleWithdrawProposal = async () => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette proposition ? Cette action est définitive.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/consent-withdraw`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur');
      }

      setSuccess('Proposition retirée. La décision est clôturée.');
      setTimeout(() => router.push(`/organizations/${slug}/decisions/${decision.id}/results`), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour soumettre une objection
  const handleSubmitObjection = async () => {
    if (objectionStatus === 'OBJECTION' && !objectionText.trim()) {
      setError('Veuillez décrire votre objection');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/consent-objections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: objectionStatus,
            objectionText: objectionStatus === 'OBJECTION' ? objectionText : null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur');
      }

      const data = await response.json();
      setUserObjection(data.objection);
      setSuccess('Votre position a été enregistrée');

      // Rafraîchir la liste des objections
      const objResponse = await fetch(`/api/organizations/${slug}/decisions/${decision.id}/consent-objections`);
      if (objResponse.ok) {
        const objData = await objResponse.json();
        setObjections(objData.objections);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', backgroundColor: 'background.default' }}>
      {/* History Panel */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        decisionId={decision.id}
        organizationSlug={slug}
      />

      {/* Main content */}
      <Box sx={{ flex: 1, p: 4, maxWidth: 1200, mx: 'auto', width: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="semibold" sx={{ mb: 1 }}>
              {decision.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip label="Décision par consentement" color="primary" size="small" />
              <Chip
                label={decision.status === 'OPEN' ? 'En cours' : 'Terminée'}
                color={decision.status === 'OPEN' ? 'success' : 'default'}
                size="small"
              />
              {currentStage && currentStage !== 'TERMINEE' && (
                <Chip
                  label={`Stade: ${currentStage}`}
                  color="info"
                  size="small"
                  icon={<AccessTime />}
                />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <HistoryButton onClick={() => setHistoryOpen(true)} />
            <Link href={`/organizations/${slug}/decisions/${decision.id}/results`}>
              <Button variant="outlined">Voir les résultats</Button>
            </Link>
          </Box>
        </Box>

        {/* Stepper */}
        {decision.status === 'OPEN' && (
          <Box sx={{ mb: 4 }}>
            <Stepper activeStep={getActiveStep()} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Messages */}
        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Description */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>Description</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{decision.description}</Typography>
          </CardContent>
        </Card>

        {/* Proposition initiale */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>
              Proposition {decision.consentAmendmentAction === 'AMENDED' ? 'initiale' : ''}
            </Typography>
            <Box sx={{
              p: 2,
              backgroundColor: 'background.secondary',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider'
            }}>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{decision.initialProposal}</Typography>
            </Box>

            {/* Proposition amendée */}
            {decision.consentAmendmentAction === 'AMENDED' && decision.proposal && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" fontWeight="semibold" color="primary" sx={{ mb: 2 }}>
                  Proposition amendée
                </Typography>
                <Box sx={{
                  p: 2,
                  backgroundColor: 'primary.light',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'primary.main'
                }}>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{decision.proposal}</Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Stades 1 & 2: Questions et Avis */}
        {(currentStage === 'CLARIFICATIONS' || currentStage === 'CLARIFAVIS' || currentStage === 'AVIS') && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {/* En-tête */}
              <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>
                {currentStage === 'CLARIFAVIS' ? 'Clarifications & Avis' : currentStage === 'CLARIFICATIONS' ? 'Questions de clarification' : 'Avis'}
              </Typography>

              {/* Timings */}
              {timings && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Cette phase se termine le{' '}
                    {currentStage === 'CLARIFAVIS' && timings.clarifavis
                      ? new Date(timings.clarifavis.endDate).toLocaleString('fr-FR')
                      : currentStage === 'CLARIFICATIONS' && timings.clarifications
                      ? new Date(timings.clarifications.endDate).toLocaleString('fr-FR')
                      : currentStage === 'AVIS' && timings.avis
                      ? new Date(timings.avis.endDate).toLocaleString('fr-FR')
                      : ''}
                  </Typography>
                </Alert>
              )}

              {/* Tabs pour CLARIFAVIS (questions + avis) */}
              {(currentStage === 'CLARIFAVIS' || currentStage === 'AVIS') ? (
                <>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                      <Tab label="Questions" icon={<QuestionAnswer />} iconPosition="start" />
                      <Tab label="Avis" icon={<Comment />} iconPosition="start" />
                    </Tabs>
                  </Box>

                  {/* Tab 1: Questions */}
                  {activeTab === 0 && (
                    <Box>
                      {/* Liste des questions */}
                      {questions.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          {questions.map(q => (
                            <Box key={q.id} sx={{ mb: 3, pb: 3, borderBottom: 1, borderColor: 'divider' }}>
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  Question de {q.questioner?.name || 'Anonyme'} •{' '}
                                  {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">{q.questionText}</Typography>
                              </Box>

                              {q.answerText ? (
                                <Box sx={{ pl: 3, borderLeft: 3, borderColor: 'success.main' }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Réponse de {q.answerer?.name || 'Créateur'}
                                  </Typography>
                                  <Typography variant="body1">{q.answerText}</Typography>
                                </Box>
                              ) : isCreator && answeringQuestionId === q.id ? (
                                <Box sx={{ pl: 3 }}>
                                  <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={newAnswer}
                                    onChange={(e) => setNewAnswer(e.target.value)}
                                    placeholder="Votre réponse..."
                                    sx={{ mb: 2 }}
                                  />
                                  <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                      variant="contained"
                                      onClick={() => handleAnswerQuestion(q.id)}
                                      disabled={loading}
                                    >
                                      Envoyer la réponse
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      onClick={() => {
                                        setAnsweringQuestionId(null);
                                        setNewAnswer('');
                                      }}
                                    >
                                      Annuler
                                    </Button>
                                  </Box>
                                </Box>
                              ) : isCreator ? (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setAnsweringQuestionId(q.id)}
                                  sx={{ ml: 3 }}
                                >
                                  Répondre
                                </Button>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ pl: 3, fontStyle: 'italic' }}>
                                  En attente de réponse
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* Formulaire pour poser une question */}
                      {isParticipant && decision.status === 'OPEN' && (
                        <Box>
                          {questions.length > 0 && <Divider sx={{ my: 3 }} />}
                          <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                            Poser une question
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Votre question..."
                            sx={{ mb: 2 }}
                          />
                          <Button
                            variant="contained"
                            onClick={handleSubmitQuestion}
                            disabled={loading || !newQuestion.trim()}
                          >
                            Envoyer la question
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Tab 2: Avis */}
                  {activeTab === 1 && (
                    <Box>
                      {/* Liste des avis */}
                      {opinions.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          {opinions.map(opinion => (
                            <Box key={opinion.id} sx={{ mb: 3, pb: 3, borderBottom: 1, borderColor: 'divider' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Avis de {opinion.user?.name || 'Anonyme'} •{' '}
                                {new Date(opinion.createdAt).toLocaleDateString('fr-FR')}
                                {opinion.updatedAt && new Date(opinion.updatedAt).getTime() > new Date(opinion.createdAt).getTime() && (
                                  <> (modifié le {new Date(opinion.updatedAt).toLocaleDateString('fr-FR')})</>
                                )}
                              </Typography>
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{opinion.content}</Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* Formulaire pour donner/modifier son avis */}
                      {isParticipant && decision.status === 'OPEN' && (
                        <Box>
                          {opinions.length > 0 && <Divider sx={{ my: 3 }} />}
                          <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                            {userOpinion ? 'Modifier votre avis' : 'Donner votre avis'}
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={5}
                            value={newOpinion}
                            onChange={(e) => setNewOpinion(e.target.value)}
                            placeholder="Partagez votre avis sur cette proposition..."
                            sx={{ mb: 2 }}
                          />
                          <Button
                            variant="contained"
                            onClick={handleSubmitOpinion}
                            disabled={loading || !newOpinion.trim()}
                          >
                            {userOpinion ? 'Modifier mon avis' : 'Envoyer mon avis'}
                          </Button>
                          {userOpinion && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              Vous pouvez modifier votre avis à tout moment tant que la décision n'est pas terminée.
                            </Typography>
                          )}
                        </Box>
                      )}

                      {opinions.length === 0 && (!isParticipant || decision.status !== 'OPEN') && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Aucun avis n'a encore été donné.
                        </Typography>
                      )}
                    </Box>
                  )}
                </>
              ) : (
                /* Mode CLARIFICATIONS uniquement (pas de tabs, juste les questions) */
                <Box>
                  {/* Liste des questions */}
                  {questions.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      {questions.map(q => (
                        <Box key={q.id} sx={{ mb: 3, pb: 3, borderBottom: 1, borderColor: 'divider' }}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Question de {q.questioner?.name || 'Anonyme'} •{' '}
                              {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">{q.questionText}</Typography>
                          </Box>

                          {q.answerText ? (
                            <Box sx={{ pl: 3, borderLeft: 3, borderColor: 'success.main' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Réponse de {q.answerer?.name || 'Créateur'}
                              </Typography>
                              <Typography variant="body1">{q.answerText}</Typography>
                            </Box>
                          ) : isCreator && answeringQuestionId === q.id ? (
                            <Box sx={{ pl: 3 }}>
                              <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={newAnswer}
                                onChange={(e) => setNewAnswer(e.target.value)}
                                placeholder="Votre réponse..."
                                sx={{ mb: 2 }}
                              />
                              <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                  variant="contained"
                                  onClick={() => handleAnswerQuestion(q.id)}
                                  disabled={loading}
                                >
                                  Envoyer la réponse
                                </Button>
                                <Button
                                  variant="outlined"
                                  onClick={() => {
                                    setAnsweringQuestionId(null);
                                    setNewAnswer('');
                                  }}
                                >
                                  Annuler
                                </Button>
                              </Box>
                            </Box>
                          ) : isCreator ? (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setAnsweringQuestionId(q.id)}
                              sx={{ ml: 3 }}
                            >
                              Répondre
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ pl: 3, fontStyle: 'italic' }}>
                              En attente de réponse
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Formulaire pour poser une question */}
                  {isParticipant && decision.status === 'OPEN' && (
                    <Box>
                      {questions.length > 0 && <Divider sx={{ my: 3 }} />}
                      <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                        Poser une question
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Votre question..."
                        sx={{ mb: 2 }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSubmitQuestion}
                        disabled={loading || !newQuestion.trim()}
                      >
                        Envoyer la question
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stade 3: Amendements (créateur seulement) */}
        {currentStage === 'AMENDEMENTS' && isCreator && (
          <Card sx={{ mb: 3, borderColor: 'warning.main', border: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>
                🔧 Amendements (Créateur uniquement)
              </Typography>

              <Alert severity="warning" sx={{ mb: 3 }}>
                Vous avez trois options :
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Option 1: Amender */}
                <Box>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                    Option 1 : Amender la proposition
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={amendedProposal}
                    onChange={(e) => setAmendedProposal(e.target.value)}
                    placeholder="Proposition amendée..."
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAmendProposal}
                    disabled={loading}
                  >
                    Amender et passer aux objections
                  </Button>
                </Box>

                <Divider />

                {/* Option 2: Garder */}
                <Box>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                    Option 2 : Garder la proposition initiale
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleKeepProposal}
                    disabled={loading}
                  >
                    Garder la proposition et passer aux objections
                  </Button>
                </Box>

                <Divider />

                {/* Option 3: Retirer */}
                <Box>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                    Option 3 : Retirer la proposition
                  </Typography>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleWithdrawProposal}
                    disabled={loading}
                  >
                    Retirer la proposition (clôture définitive)
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {currentStage === 'AMENDEMENTS' && !isCreator && (
          <Alert severity="info" sx={{ mb: 3 }}>
            En attente de la décision du créateur (amender, garder ou retirer la proposition).
          </Alert>
        )}

        {/* Stade 4: Objections */}
        {currentStage === 'OBJECTIONS' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>
                Objections
              </Typography>

              {timings && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Phase finale se terminant le {new Date(timings.objections.endDate).toLocaleString('fr-FR')}
                </Alert>
              )}

              {isParticipant && decision.status === 'OPEN' && (
                <Box sx={{ mb: 4 }}>
                  <FormLabel component="legend" sx={{ mb: 2 }}>Votre position</FormLabel>
                  <RadioGroup
                    value={objectionStatus}
                    onChange={(e) => setObjectionStatus(e.target.value)}
                  >
                    <FormControlLabel
                      value="NO_OBJECTION"
                      control={<Radio />}
                      label="✅ Pas d'objection (je consens)"
                    />
                    <FormControlLabel
                      value="NO_POSITION"
                      control={<Radio />}
                      label="⚪ Sans position"
                    />
                    <FormControlLabel
                      value="OBJECTION"
                      control={<Radio />}
                      label="🚫 J'ai une objection"
                    />
                  </RadioGroup>

                  {objectionStatus === 'OBJECTION' && (
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={objectionText}
                      onChange={(e) => setObjectionText(e.target.value)}
                      placeholder="Décrivez votre objection..."
                      sx={{ mt: 2, mb: 2 }}
                    />
                  )}

                  <Button
                    variant="contained"
                    onClick={handleSubmitObjection}
                    disabled={loading}
                    sx={{ mt: 2 }}
                  >
                    {userObjection ? 'Mettre à jour ma position' : 'Enregistrer ma position'}
                  </Button>
                </Box>
              )}

              {/* Liste des objections */}
              {objections.length > 0 && (
                <Box>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                    Positions des participants ({objections.length}/{decision.participants.length})
                  </Typography>
                  {objections.map(obj => (
                    <Box key={obj.id} sx={{ mb: 2, p: 2, backgroundColor: 'background.secondary', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {obj.user?.name || 'Anonyme'}
                        </Typography>
                        <Chip
                          label={
                            obj.status === 'NO_OBJECTION' ? 'Pas d\'objection' :
                            obj.status === 'OBJECTION' ? 'Objection' :
                            'Sans position'
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
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {obj.objectionText}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stade 5: Terminée */}
        {currentStage === 'TERMINEE' && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Cette décision est terminée. Consultez les résultats.
          </Alert>
        )}

        {/* Section commentaires (toujours visible) */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>
              Discussion
            </Typography>
            <Alert severity="info">
              Les commentaires apparaîtront ici. Cette fonctionnalité réutilise le système de commentaires existant.
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
