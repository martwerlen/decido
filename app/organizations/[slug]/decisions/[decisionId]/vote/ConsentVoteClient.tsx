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
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { AccessTime, CheckCircle, Info } from '@mui/icons-material';
import { ConsentStage, ConsentStepMode } from '@/types/enums';
import { calculateConsentStageTimings, getCurrentConsentStage } from '@/lib/consent-logic';
import HistoryButton from '@/components/decisions/HistoryButton';
import HistoryPanel from '@/components/decisions/HistoryPanel';
import ConsentAccordionStages from './ConsentAccordionStages';

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

interface TeamMember {
  member: {
    userId: string;
  };
}

interface OrganizationTeam {
  id: string;
  name: string;
  members: TeamMember[];
}

interface Decision {
  id: string;
  title: string;
  description: string;
  initialProposal: string | null;
  proposal: string | null;
  status: string;
  result: string | null;
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
  organizationTeams: OrganizationTeam[];
  slug: string;
  userId: string;
  isCreator: boolean;
}

export default function ConsentVoteClient({
  decision,
  clarificationQuestions: initialQuestions,
  userObjection: initialUserObjection,
  allObjections: initialAllObjections,
  organizationTeams,
  slug,
  userId,
  isCreator,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

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

  // Commentaires (thread de discussion pour étape objections)
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  // Calculer le stade actuel et les timings
  const currentStage = decision.consentCurrentStage as ConsentStage || 'CLARIFICATIONS';
  const stepMode = decision.consentStepMode as ConsentStepMode || 'DISTINCT';

  const timings = decision.startDate && decision.endDate
    ? calculateConsentStageTimings(new Date(decision.startDate), new Date(decision.endDate), stepMode)
    : null;

  const isParticipant = decision.participants.some(p => p.userId === userId);

  // Formater la liste des participants
  const formatParticipantsList = () => {
    const participantItems: string[] = [];
    const processedTeamIds = new Set<string>();
    const processedUserIds = new Set<string>();

    // Regrouper les participants par équipe
    const participantsByTeam = new Map<string, any[]>();
    const participantsWithoutTeam: any[] = [];

    decision.participants.forEach(participant => {
      if (participant.teamId) {
        if (!participantsByTeam.has(participant.teamId)) {
          participantsByTeam.set(participant.teamId, []);
        }
        participantsByTeam.get(participant.teamId)!.push(participant);
      } else {
        participantsWithoutTeam.push(participant);
      }
    });

    // Vérifier chaque équipe de l'organisation
    organizationTeams.forEach(team => {
      const teamParticipants = participantsByTeam.get(team.id) || [];
      const teamMemberUserIds = team.members.map(m => m.member.userId);

      // Vérifier si TOUS les membres de l'équipe sont participants
      const allMembersAreParticipants = teamMemberUserIds.length > 0 &&
        teamMemberUserIds.every(userId =>
          teamParticipants.some(p => p.userId === userId)
        );

      if (allMembersAreParticipants) {
        // Toute l'équipe est invitée
        participantItems.push(`Équipe ${team.name}`);
        processedTeamIds.add(team.id);
        // Marquer tous les membres de l'équipe comme traités
        teamParticipants.forEach(p => {
          if (p.userId) processedUserIds.add(p.userId);
        });
      }
    });

    // Ajouter les participants individuels des équipes partiellement invitées
    participantsByTeam.forEach((teamParticipants, teamId) => {
      if (!processedTeamIds.has(teamId)) {
        teamParticipants.forEach(participant => {
          if (participant.userId && !processedUserIds.has(participant.userId)) {
            const name = participant.user?.name || participant.user?.email || 'Utilisateur';
            participantItems.push(name);
            processedUserIds.add(participant.userId);
          } else if (!participant.userId && participant.externalName) {
            // Participant externe
            participantItems.push(participant.externalName);
          }
        });
      }
    });

    // Ajouter les participants sans équipe
    participantsWithoutTeam.forEach(participant => {
      if (participant.userId && !processedUserIds.has(participant.userId)) {
        const name = participant.user?.name || participant.user?.email || 'Utilisateur';
        participantItems.push(name);
        processedUserIds.add(participant.userId);
      } else if (!participant.userId && participant.externalName) {
        // Participant externe
        participantItems.push(participant.externalName);
      }
    });

    return {
      count: decision.participants.length,
      items: participantItems
    };
  };

  const participantsInfo = formatParticipantsList();

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

  // Fonction pour ajouter un commentaire
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour modifier un commentaire
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
            {/* Liste des participants */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {participantsInfo.count} participant{participantsInfo.count > 1 ? 's' : ''} : {participantsInfo.items.join(', ')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <HistoryButton onClick={() => setHistoryOpen(true)} />
            <Link href={`/organizations/${slug}/decisions/${decision.id}/results`}>
              <Button variant="outlined">Voir les résultats</Button>
            </Link>
          </Box>
        </Box>

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

        {/* Accordéon des 5 étapes */}
        <ConsentAccordionStages
          currentStage={currentStage}
          stepMode={stepMode}
          timings={timings}
          isCreator={isCreator}
          isParticipant={isParticipant}
          decisionStatus={decision.status}
          decisionResult={decision.result}
          questions={questions}
          newQuestion={newQuestion}
          setNewQuestion={setNewQuestion}
          newAnswer={newAnswer}
          setNewAnswer={setNewAnswer}
          answeringQuestionId={answeringQuestionId}
          setAnsweringQuestionId={setAnsweringQuestionId}
          onSubmitQuestion={handleSubmitQuestion}
          onAnswerQuestion={handleAnswerQuestion}
          opinions={opinions}
          userOpinion={userOpinion}
          newOpinion={newOpinion}
          setNewOpinion={setNewOpinion}
          onSubmitOpinion={handleSubmitOpinion}
          objections={objections}
          userObjection={userObjection}
          objectionStatus={objectionStatus}
          setObjectionStatus={setObjectionStatus}
          objectionText={objectionText}
          setObjectionText={setObjectionText}
          onSubmitObjection={handleSubmitObjection}
          amendedProposal={amendedProposal}
          setAmendedProposal={setAmendedProposal}
          onAmendProposal={handleAmendProposal}
          onKeepProposal={handleKeepProposal}
          onWithdrawProposal={handleWithdrawProposal}
          comments={decision.comments}
          newComment={newComment}
          setNewComment={setNewComment}
          editingCommentId={editingCommentId}
          setEditingCommentId={setEditingCommentId}
          editingCommentContent={editingCommentContent}
          setEditingCommentContent={setEditingCommentContent}
          onAddComment={handleAddComment}
          onUpdateComment={handleUpdateComment}
          userId={userId}
          slug={slug}
          loading={loading}
        />
      </Box>
    </Box>
  );
}
