'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  Alert,
  TextField,
  Button,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  QuestionAnswer,
  Comment,
  Edit,
  ThumbUp,
  Cancel,
  CheckCircle,
  Lock,
} from '@mui/icons-material';
import { ConsentStage, ConsentStepMode } from '@/types/enums';
import { AllStageTimings } from '@/lib/consent-logic';

interface ClarificationQuestion {
  id: string;
  questionText: string;
  answerText: string | null;
  questioner: { id: string; name: string | null; email: string } | null;
  answerer: { id: string; name: string | null } | null;
  createdAt: Date;
  answeredAt: Date | null;
}

interface OpinionResponse {
  id: string;
  content: string;
  user: { id: string; name: string | null; email: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ConsentObjection {
  id: string;
  status: string;
  objectionText: string | null;
  user: { id: string; name: string | null; email: string } | null;
  withdrawnAt: Date | null;
  createdAt: Date;
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
  } | null;
}

interface Props {
  currentStage: ConsentStage;
  stepMode: ConsentStepMode;
  timings: AllStageTimings | null;
  isCreator: boolean;
  isParticipant: boolean;
  decisionStatus: string;
  decisionResult: string | null;

  // Questions
  questions: ClarificationQuestion[];
  newQuestion: string;
  setNewQuestion: (value: string) => void;
  newAnswer: string;
  setNewAnswer: (value: string) => void;
  answeringQuestionId: string | null;
  setAnsweringQuestionId: (value: string | null) => void;
  onSubmitQuestion: () => void;
  onAnswerQuestion: (questionId: string) => void;

  // Opinions
  opinions: OpinionResponse[];
  userOpinion: OpinionResponse | null;
  newOpinion: string;
  setNewOpinion: (value: string) => void;
  onSubmitOpinion: () => void;

  // Objections
  objections: ConsentObjection[];
  userObjection: ConsentObjection | null;
  objectionStatus: string;
  setObjectionStatus: (value: string) => void;
  objectionText: string;
  setObjectionText: (value: string) => void;
  onSubmitObjection: () => void;

  // Amendements (creator only)
  amendedProposal: string;
  setAmendedProposal: (value: string) => void;
  onAmendProposal: () => void;
  onKeepProposal: () => void;
  onWithdrawProposal: () => void;

  // Comments
  comments: Comment[];
  newComment: string;
  setNewComment: (value: string) => void;
  editingCommentId: string | null;
  setEditingCommentId: (value: string | null) => void;
  editingCommentContent: string;
  setEditingCommentContent: (value: string) => void;
  onAddComment: () => void;
  onUpdateComment: (commentId: string) => void;
  userId: string;
  slug: string;

  loading: boolean;
}

export default function ConsentAccordionStages({
  currentStage,
  stepMode,
  timings,
  isCreator,
  isParticipant,
  decisionStatus,
  decisionResult,
  questions,
  newQuestion,
  setNewQuestion,
  newAnswer,
  setNewAnswer,
  answeringQuestionId,
  setAnsweringQuestionId,
  onSubmitQuestion,
  onAnswerQuestion,
  opinions,
  userOpinion,
  newOpinion,
  setNewOpinion,
  onSubmitOpinion,
  objections,
  userObjection,
  objectionStatus,
  setObjectionStatus,
  objectionText,
  setObjectionText,
  onSubmitObjection,
  amendedProposal,
  setAmendedProposal,
  onAmendProposal,
  onKeepProposal,
  onWithdrawProposal,
  comments,
  newComment,
  setNewComment,
  editingCommentId,
  setEditingCommentId,
  editingCommentContent,
  setEditingCommentContent,
  onAddComment,
  onUpdateComment,
  userId,
  slug,
  loading,
}: Props) {
  // État d'ouverture des accordéons
  const [expandedStage1, setExpandedStage1] = useState(
    currentStage === 'CLARIFICATIONS' || currentStage === 'CLARIFAVIS'
  );
  const [expandedStage2, setExpandedStage2] = useState(
    currentStage === 'CLARIFAVIS' || currentStage === 'AVIS'
  );
  const [expandedStage3, setExpandedStage3] = useState(currentStage === 'AMENDEMENTS');
  const [expandedStage4, setExpandedStage4] = useState(currentStage === 'OBJECTIONS');
  const [expandedStage5, setExpandedStage5] = useState(currentStage === 'TERMINEE');

  // Déterminer l'état de chaque étape (ACTIF, PASSÉ, FUTUR)
  const getStageStatus = (stage: ConsentStage): 'ACTIF' | 'PASSÉ' | 'FUTUR' => {
    // Mode MERGED: CLARIFAVIS active les étapes 1 et 2 simultanément
    if (stepMode === 'MERGED' && currentStage === 'CLARIFAVIS') {
      if (stage === 'CLARIFICATIONS' || stage === 'AVIS') return 'ACTIF';
      if (stage === 'AMENDEMENTS' || stage === 'OBJECTIONS' || stage === 'TERMINEE') return 'FUTUR';
    }

    // Mode MERGED: après CLARIFAVIS, les étapes 1 et 2 sont passées
    if (stepMode === 'MERGED' && currentStage !== 'CLARIFAVIS') {
      if (stage === 'CLARIFICATIONS' || stage === 'AVIS') {
        return ['AMENDEMENTS', 'OBJECTIONS', 'TERMINEE'].includes(currentStage) ? 'PASSÉ' : 'FUTUR';
      }
    }

    // Mode DISTINCT ou autres cas
    if (currentStage === 'CLARIFICATIONS') {
      if (stage === 'CLARIFICATIONS') return 'ACTIF';
      return 'FUTUR';
    }
    if (currentStage === 'AVIS') {
      if (stage === 'CLARIFICATIONS') return 'PASSÉ';
      if (stage === 'AVIS') return 'ACTIF';
      return 'FUTUR';
    }
    if (currentStage === 'AMENDEMENTS') {
      if (stage === 'CLARIFICATIONS' || stage === 'AVIS') return 'PASSÉ';
      if (stage === 'AMENDEMENTS') return 'ACTIF';
      return 'FUTUR';
    }
    if (currentStage === 'OBJECTIONS') {
      if (stage === 'CLARIFICATIONS' || stage === 'AVIS' || stage === 'AMENDEMENTS') return 'PASSÉ';
      if (stage === 'OBJECTIONS') return 'ACTIF';
      if (stage === 'TERMINEE') return 'FUTUR';
    }
    if (currentStage === 'TERMINEE') {
      if (stage === 'TERMINEE') return 'ACTIF';
      return 'PASSÉ';
    }

    return 'FUTUR';
  };

  const getStageIcon = (stage: ConsentStage, status: 'ACTIF' | 'PASSÉ' | 'FUTUR') => {
    if (status === 'ACTIF') {
      if (stage === 'CLARIFICATIONS' || stage === 'CLARIFAVIS') return <QuestionAnswer />;
      if (stage === 'AVIS') return <Comment />;
      if (stage === 'AMENDEMENTS') return <Edit />;
      if (stage === 'OBJECTIONS') return <ThumbUp />;
      if (stage === 'TERMINEE') return <CheckCircle />;
    }
    if (status === 'PASSÉ') return <CheckCircle color="success" />;
    return <Lock color="disabled" />;
  };

  const getStageColor = (status: 'ACTIF' | 'PASSÉ' | 'FUTUR') => {
    if (status === 'ACTIF') return 'primary';
    if (status === 'PASSÉ') return 'success';
    return 'default';
  };

  const getStageDate = (stage: ConsentStage) => {
    if (!timings) return null;

    if (stage === 'CLARIFICATIONS' && timings.clarifications) {
      return timings.clarifications.endDate;
    }
    if (stage === 'CLARIFAVIS' && timings.clarifavis) {
      return timings.clarifavis.endDate;
    }
    if (stage === 'AVIS' && timings.avis) {
      return timings.avis.endDate;
    }
    if (stage === 'AMENDEMENTS' && timings.amendements) {
      return timings.amendements.endDate;
    }
    if (stage === 'OBJECTIONS' && timings.objections) {
      return timings.objections.endDate;
    }
    return null;
  };

  // Render questions section
  const renderQuestions = (isActive: boolean) => (
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
                      onClick={() => onAnswerQuestion(q.id)}
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

      {/* Formulaire pour poser une question (uniquement si stade actif) */}
      {isActive && isParticipant && decisionStatus === 'OPEN' && (
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
            onClick={onSubmitQuestion}
            disabled={loading || !newQuestion.trim()}
          >
            Envoyer la question
          </Button>
        </Box>
      )}

      {!isActive && questions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Aucune question n'a été posée.
        </Typography>
      )}
    </Box>
  );

  // Render opinions section
  const renderOpinions = (isActive: boolean) => (
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

      {/* Formulaire pour donner/modifier son avis (uniquement si stade actif) */}
      {isActive && isParticipant && decisionStatus === 'OPEN' && (
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
            onClick={onSubmitOpinion}
            disabled={loading || !newOpinion.trim()}
          >
            {userOpinion ? 'Modifier mon avis' : 'Envoyer mon avis'}
          </Button>
        </Box>
      )}

      {!isActive && (
        <Alert severity="info" sx={{ mt: 2 }}>
          La phase d'avis est terminée. Vous ne pouvez plus modifier votre avis.
        </Alert>
      )}

      {opinions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Aucun avis n'a encore été donné.
        </Typography>
      )}
    </Box>
  );

  const status1 = getStageStatus('CLARIFICATIONS');
  const status2 = getStageStatus('AVIS');
  const status3 = getStageStatus('AMENDEMENTS');
  const status4 = getStageStatus('OBJECTIONS');
  const status5 = getStageStatus('TERMINEE');

  const date3 = getStageDate('AMENDEMENTS');

  return (
    <Box>
      {/* Étape 1: Clarifications */}
      <Accordion
        expanded={expandedStage1}
        onChange={() => setExpandedStage1(!expandedStage1)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            {getStageIcon('CLARIFICATIONS', status1)}
            <Typography variant="h6" fontWeight="semibold">
              1. Clarifications
            </Typography>
            <Chip
              label={status1}
              color={getStageColor(status1) as any}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {status1 === 'FUTUR' && timings?.clarifications && (
            <Alert severity="info">
              Cette étape ouvrira le {new Date(timings.clarifications.startDate).toLocaleString('fr-FR')}
            </Alert>
          )}
          {(status1 === 'ACTIF' || status1 === 'PASSÉ') && renderQuestions(status1 === 'ACTIF')}
        </AccordionDetails>
      </Accordion>

      {/* Étape 2: Avis */}
      <Accordion
        expanded={expandedStage2}
        onChange={() => setExpandedStage2(!expandedStage2)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            {getStageIcon('AVIS', status2)}
            <Typography variant="h6" fontWeight="semibold">
              2. Avis
            </Typography>
            <Chip
              label={status2}
              color={getStageColor(status2) as any}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {status2 === 'FUTUR' && timings?.avis && (
            <Alert severity="info">
              Cette étape ouvrira le {new Date(timings.avis.startDate).toLocaleString('fr-FR')}
            </Alert>
          )}
          {(status2 === 'ACTIF' || status2 === 'PASSÉ') && renderOpinions(status2 === 'ACTIF')}
        </AccordionDetails>
      </Accordion>

      {/* Étape 3: Amendements */}
      <Accordion
        expanded={expandedStage3}
        onChange={() => setExpandedStage3(!expandedStage3)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            {getStageIcon('AMENDEMENTS', status3)}
            <Typography variant="h6" fontWeight="semibold">
              3. Amendements
            </Typography>
            <Chip
              label={status3}
              color={getStageColor(status3) as any}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {status3 === 'FUTUR' && timings?.amendements && (
            <Alert severity="info">
              Cette étape ouvrira le {new Date(timings.amendements.startDate).toLocaleDateString('fr-FR')} à {new Date(timings.amendements.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Alert>
          )}
          {status3 === 'ACTIF' && !isCreator && date3 && (
            <Alert severity="warning">
              Jusqu'au {new Date(date3).toLocaleDateString('fr-FR')} à {new Date(date3).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}, le proposeur peut conserver sa proposition telle quelle, la faire évoluer ou la retirer. Vous pourrez contribuer après cette étape.
            </Alert>
          )}
          {status3 === 'ACTIF' && isCreator && (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Vous avez trois options :
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                    Option 1 : Amender la proposition
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={amendedProposal}
                    onChange={(e) => setAmendedProposal(e.target.value)}
                    placeholder="Nouvelle version de la proposition..."
                    sx={{ mb: 2 }}
                  />
                  <Button variant="contained" onClick={onAmendProposal} disabled={loading}>
                    Amender et passer aux objections
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                    Option 2 : Garder la proposition initiale
                  </Typography>
                  <Button variant="outlined" onClick={onKeepProposal} disabled={loading}>
                    Conserver et passer aux objections
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                    Option 3 : Retirer la proposition
                  </Typography>
                  <Button variant="outlined" color="error" onClick={onWithdrawProposal} disabled={loading}>
                    Retirer définitivement
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Étape 4: Objections */}
      <Accordion
        expanded={expandedStage4}
        onChange={() => setExpandedStage4(!expandedStage4)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            {getStageIcon('OBJECTIONS', status4)}
            <Typography variant="h6" fontWeight="semibold">
              4. Objections
            </Typography>
            <Chip
              label={status4}
              color={getStageColor(status4) as any}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {status4 === 'FUTUR' && timings?.objections && (
            <Alert severity="info">
              Cette étape ouvrira le {new Date(timings.objections.startDate).toLocaleString('fr-FR')}
            </Alert>
          )}
          {status4 === 'ACTIF' && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Donnez votre position sur la proposition
              </Alert>

              {/* Formulaire objection */}
              {isParticipant && !userObjection && (
                <Box>
                  <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                    Votre position
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    <Button
                      variant={objectionStatus === 'NO_OBJECTION' ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => setObjectionStatus('NO_OBJECTION')}
                    >
                      Pas d'objection
                    </Button>
                    <Button
                      variant={objectionStatus === 'OBJECTION' ? 'contained' : 'outlined'}
                      color="error"
                      onClick={() => setObjectionStatus('OBJECTION')}
                    >
                      J'ai une objection
                    </Button>
                    <Button
                      variant={objectionStatus === 'NO_POSITION' ? 'contained' : 'outlined'}
                      onClick={() => setObjectionStatus('NO_POSITION')}
                    >
                      Je ne me prononce pas
                    </Button>
                  </Box>

                  {objectionStatus === 'OBJECTION' && (
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={objectionText}
                      onChange={(e) => setObjectionText(e.target.value)}
                      placeholder="Décrivez votre objection..."
                      sx={{ mb: 2 }}
                    />
                  )}

                  <Button
                    variant="contained"
                    onClick={onSubmitObjection}
                    disabled={loading}
                  >
                    Enregistrer ma position
                  </Button>
                </Box>
              )}

              {userObjection && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Vous avez enregistré votre position : {userObjection.status}
                </Alert>
              )}

              {/* Liste des objections */}
              {objections.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Positions des participants
                  </Typography>
                  {objections.map(obj => (
                    <Box key={obj.id} sx={{ mb: 2, p: 2, backgroundColor: 'background.secondary', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {obj.user?.name || 'Anonyme'}
                      </Typography>
                      <Chip
                        label={obj.status}
                        size="small"
                        color={obj.status === 'NO_OBJECTION' ? 'success' : obj.status === 'OBJECTION' ? 'error' : 'default'}
                        sx={{ mt: 1 }}
                      />
                      {obj.objectionText && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {obj.objectionText}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}

              {/* C. Discussion (Commentaires) */}
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>
                  C. Discussion
                </Typography>

                {/* Liste des commentaires */}
                {comments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 3 }}>
                    Aucun commentaire pour le moment
                  </Typography>
                ) : (
                  <Box sx={{ mb: 3 }}>
                    {comments.map((comment) => (
                      <Box key={comment.id} sx={{ mb: 3, pb: 3, borderLeft: 4, borderColor: 'divider', pl: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {comment.user?.name || 'Anonyme'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(comment.createdAt).toLocaleString('fr-FR')}
                                {new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime() && ' (modifié)'}
                              </Typography>
                            </Box>

                            {editingCommentId === comment.id ? (
                              <Box>
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={3}
                                  value={editingCommentContent}
                                  onChange={(e) => setEditingCommentContent(e.target.value)}
                                  sx={{ mb: 2 }}
                                />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => onUpdateComment(comment.id)}
                                    disabled={loading}
                                  >
                                    Enregistrer
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentContent('');
                                    }}
                                  >
                                    Annuler
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {comment.content}
                              </Typography>
                            )}
                          </Box>

                          {comment.user?.id === userId && decisionStatus === 'OPEN' && !editingCommentId && (
                            <Button
                              size="small"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentContent(comment.content);
                              }}
                              sx={{ ml: 2 }}
                            >
                              Modifier
                            </Button>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Formulaire pour ajouter un commentaire */}
                {decisionStatus === 'OPEN' && (
                  <Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ajoutez votre commentaire..."
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      onClick={onAddComment}
                      disabled={loading || !newComment.trim()}
                    >
                      {loading ? 'Envoi...' : 'Ajouter un commentaire'}
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Étape 5: Terminée */}
      <Accordion
        expanded={expandedStage5}
        onChange={() => setExpandedStage5(!expandedStage5)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            {getStageIcon('TERMINEE', status5)}
            <Typography variant="h6" fontWeight="semibold">
              5. Terminée
            </Typography>
            <Chip
              label={status5}
              color={getStageColor(status5) as any}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {status5 === 'ACTIF' && decisionResult && (
            <Box>
              <Alert
                severity={
                  decisionResult === 'APPROVED' ? 'success' :
                  decisionResult === 'BLOCKED' ? 'error' :
                  'info'
                }
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">
                  {decisionResult === 'APPROVED' && 'Décision approuvée par consentement'}
                  {decisionResult === 'BLOCKED' && 'Décision bloquée par une objection'}
                  {decisionResult === 'WITHDRAWN' && 'Proposition retirée'}
                </Typography>
              </Alert>
            </Box>
          )}
          {status5 === 'FUTUR' && (
            <Alert severity="info">
              La décision se terminera automatiquement à la date limite ou lorsque tous les participants auront voté.
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
