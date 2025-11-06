'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DecisionTypeLabels,
  NuancedScaleLabels,
} from '@/types/enums';
import { useSidebarRefresh } from '@/components/providers/SidebarRefreshProvider';
import {
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Checkbox,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';

type DecisionType = 'MAJORITY' | 'CONSENSUS' | 'NUANCED_VOTE' | 'ADVICE_SOLICITATION';
type NuancedScale = '3_LEVELS' | '5_LEVELS' | '7_LEVELS';

const DecisionTypeTooltips: Record<DecisionType, string> = {
  CONSENSUS: "Échanger ensemble pour tomber tous d'accord",
  MAJORITY: "Voter chacun pour une seule proposition et la majorité l'emporte",
  NUANCED_VOTE: "Évaluer chacun toutes les propositions et la proposition avec le plus de partisans l'emporte",
  ADVICE_SOLICITATION: "Solliciter l'avis de personnes compétentes avant de décider en autonomie",
};

interface NuancedProposal {
  title: string;
  description: string;
}

interface Team {
  id: string;
  name: string;
  _count: {
    members: number;
  };
}

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ExternalParticipant {
  name: string;
  email: string;
}

interface Participant {
  id: string;
  userId: string | null;
  externalEmail: string | null;
  externalName: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface DraftDecision {
  id: string;
  title: string;
  description: string;
  context: string | null;
  decisionType: string;
  initialProposal: string | null;
  endDate: Date | null;
  votingMode: string;
  publicSlug: string | null;
  nuancedScale: string | null;
  nuancedWinnerCount: number | null;
  proposals: Array<{ title: string; description: string | null; order: number }>;
  nuancedProposals: Array<{ title: string; description: string | null; order: number }>;
  participants: Participant[];
  updatedAt: Date;
}

interface Props {
  slug: string;
  userId: string;
  teams: Team[];
  members: Member[];
  totalMemberCount: number;
  draftDecision: DraftDecision | null;
}

export default function NewDecisionClient({
  slug,
  userId,
  teams,
  members,
  totalMemberCount,
  draftDecision,
}: Props) {
  const router = useRouter();
  const { refreshSidebar } = useSidebarRefresh();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    context: '',
    decisionType: 'MAJORITY' as DecisionType,
    initialProposal: '',
    endDate: '',
    votingMode: 'INVITED' as 'INVITED' | 'PUBLIC_LINK',
    publicSlug: '',
    nuancedScale: '5_LEVELS' as NuancedScale,
    nuancedWinnerCount: 1,
  });

  const [nuancedProposals, setNuancedProposals] = useState<NuancedProposal[]>([
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  const [majorityProposals, setMajorityProposals] = useState<NuancedProposal[]>([
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  // Participants state
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<ExternalParticipant[]>([]);
  const [newExternalName, setNewExternalName] = useState('');
  const [newExternalEmail, setNewExternalEmail] = useState('');

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const [draftId, setDraftId] = useState<string | null>(draftDecision?.id || null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(draftDecision?.updatedAt || null);

  // Charger les données du brouillon
  useEffect(() => {
    if (draftDecision) {
      setFormData({
        title: draftDecision.title || '',
        description: draftDecision.description || '',
        context: draftDecision.context || '',
        decisionType: draftDecision.decisionType as DecisionType,
        initialProposal: draftDecision.initialProposal || '',
        endDate: draftDecision.endDate ? new Date(draftDecision.endDate).toISOString().slice(0, 16) : '',
        votingMode: draftDecision.votingMode as 'INVITED' | 'PUBLIC_LINK',
        publicSlug: draftDecision.publicSlug || '',
        nuancedScale: (draftDecision.nuancedScale || '5_LEVELS') as NuancedScale,
        nuancedWinnerCount: draftDecision.nuancedWinnerCount || 1,
      });

      if (draftDecision.decisionType === 'MAJORITY' && draftDecision.proposals.length > 0) {
        setMajorityProposals(draftDecision.proposals.map(p => ({
          title: p.title,
          description: p.description || '',
        })));
      }

      if (draftDecision.decisionType === 'NUANCED_VOTE' && draftDecision.nuancedProposals.length > 0) {
        setNuancedProposals(draftDecision.nuancedProposals.map(p => ({
          title: p.title,
          description: p.description || '',
        })));
      }

      // Charger les participants
      const teamIds: string[] = [];
      const memberIds: string[] = [];
      const externals: ExternalParticipant[] = [];

      draftDecision.participants.forEach(p => {
        if (p.userId && p.userId !== userId) {
          memberIds.push(p.userId);
        } else if (p.externalEmail && p.externalName) {
          externals.push({ name: p.externalName, email: p.externalEmail });
        }
      });

      setSelectedMembers(memberIds);
      setExternalParticipants(externals);
    }
  }, [draftDecision, userId]);

  const normalizeSlug = (input: string): string => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  };

  const checkSlugAvailability = async (slugValue: string) => {
    if (!slugValue || slugValue.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/check-public-slug?slug=${encodeURIComponent(slugValue)}`
      );
      const data = await response.json();
      setSlugAvailable(data.available);
    } catch (err) {
      console.error('Error checking slug:', err);
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const addNuancedProposal = () => {
    if (nuancedProposals.length < 25) {
      setNuancedProposals([...nuancedProposals, { title: '', description: '' }]);
    }
  };

  const removeNuancedProposal = (index: number) => {
    if (nuancedProposals.length > 2) {
      setNuancedProposals(nuancedProposals.filter((_, i) => i !== index));
    }
  };

  const updateNuancedProposal = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...nuancedProposals];
    updated[index][field] = value;
    setNuancedProposals(updated);
  };

  const addMajorityProposal = () => {
    if (majorityProposals.length < 25) {
      setMajorityProposals([...majorityProposals, { title: '', description: '' }]);
    }
  };

  const removeMajorityProposal = (index: number) => {
    if (majorityProposals.length > 2) {
      setMajorityProposals(majorityProposals.filter((_, i) => i !== index));
    }
  };

  const updateMajorityProposal = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...majorityProposals];
    updated[index][field] = value;
    setMajorityProposals(updated);
  };

  const addExternalParticipant = () => {
    if (newExternalName && newExternalEmail) {
      setExternalParticipants([...externalParticipants, { name: newExternalName, email: newExternalEmail }]);
      setNewExternalName('');
      setNewExternalEmail('');
    }
  };

  const removeExternalParticipant = (index: number) => {
    setExternalParticipants(externalParticipants.filter((_, i) => i !== index));
  };

  const validateForm = (isLaunch: boolean): string[] => {
    const errors: string[] = [];

    if (!formData.title.trim()) {
      errors.push('Le titre est requis');
    }

    if (isLaunch) {
      if (!formData.description.trim()) {
        errors.push('La description est requise');
      }

      // Validation spécifique par type de décision
      if (formData.decisionType === 'CONSENSUS' && !formData.initialProposal.trim()) {
        errors.push('Une proposition initiale est requise pour le consensus');
      }

      if (formData.decisionType === 'ADVICE_SOLICITATION' && !formData.initialProposal.trim()) {
        errors.push('Une intention de décision est requise pour la sollicitation d\'avis');
      }

      if (formData.decisionType === 'MAJORITY') {
        const validProposals = majorityProposals.filter(p => p.title.trim() !== '');
        if (validProposals.length < 2) {
          errors.push('Au moins 2 propositions sont requises pour le vote à la majorité');
        }
      }

      if (formData.decisionType === 'NUANCED_VOTE') {
        const validProposals = nuancedProposals.filter(p => p.title.trim() !== '');
        if (validProposals.length < 2) {
          errors.push('Au moins 2 propositions sont requises pour le vote nuancé');
        }
        if (formData.nuancedWinnerCount > validProposals.length) {
          errors.push('Le nombre de gagnants ne peut pas dépasser le nombre de propositions');
        }
      }

      // Validation de la date limite
      if (formData.decisionType !== 'ADVICE_SOLICITATION') {
        if (!formData.endDate) {
          errors.push('La date de fin est requise');
        } else {
          const endDate = new Date(formData.endDate);
          const minDate = new Date();
          minDate.setHours(minDate.getHours() + 24);
          if (endDate < minDate) {
            errors.push('La date de fin doit être au moins 24h dans le futur');
          }
        }
      }

      // Validation des participants (mode INVITED uniquement)
      if (formData.votingMode === 'INVITED') {
        const totalParticipants = selectedTeams.length + selectedMembers.length + externalParticipants.length;
        if (totalParticipants === 0) {
          errors.push('Au moins un participant doit être invité');
        }

        // Validation spécifique ADVICE_SOLICITATION
        if (formData.decisionType === 'ADVICE_SOLICITATION') {
          const internalParticipants = selectedMembers.length;
          const externalCount = externalParticipants.length;

          let minimumRequired = 1;
          if (totalMemberCount === 1) {
            minimumRequired = 1;
            if (externalCount < 1) {
              errors.push('Votre organisation ne compte qu\'un membre. Vous devez inviter au moins 1 personne externe.');
            }
          } else if (totalMemberCount >= 2 && totalMemberCount <= 4) {
            minimumRequired = 1;
          } else if (totalMemberCount >= 5) {
            minimumRequired = 3;
          }

          if (internalParticipants + externalCount < minimumRequired) {
            errors.push(`Vous devez solliciter au moins ${minimumRequired} personne(s) pour cette sollicitation d'avis.`);
          }
        }
      }

      // Validation PUBLIC_LINK
      if (formData.votingMode === 'PUBLIC_LINK') {
        if (!formData.publicSlug || formData.publicSlug.length < 3) {
          errors.push('Le slug doit contenir au moins 3 caractères');
        }
        if (slugAvailable === false) {
          errors.push('Ce slug est déjà utilisé. Veuillez en choisir un autre.');
        }
      }
    }

    return errors;
  };

  const handleSaveDraft = async () => {
    const errors = validateForm(false);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSavingDraft(true);
    setError('');
    setValidationErrors([]);

    try {
      const body: any = { ...formData };

      // Ajouter le draftId s'il existe (pour mettre à jour le brouillon existant)
      if (draftId) {
        body.draftId = draftId;
      }

      if (formData.decisionType === 'NUANCED_VOTE') {
        body.nuancedProposals = nuancedProposals.filter(p => p.title.trim() !== '');
      } else if (formData.decisionType === 'MAJORITY') {
        body.proposals = majorityProposals.filter(p => p.title.trim() !== '');
      }

      // Ajouter les participants pour les brouillons
      if (formData.votingMode === 'INVITED') {
        body.participants = {
          teamIds: selectedTeams,
          memberIds: selectedMembers,
          externalParticipants: externalParticipants,
        };
      }

      const response = await fetch(`/api/organizations/${slug}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        // Stocker l'ID du brouillon si c'est la première sauvegarde
        if (!draftId) {
          setDraftId(data.decision.id);
        }
        setLastSavedAt(new Date());
        refreshSidebar();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Erreur lors de la sauvegarde du brouillon');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleLaunch = async () => {
    const errors = validateForm(true);
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError('');
    setValidationErrors([]);

    try {
      const body: any = {
        ...formData,
        launch: true, // Signal pour lancer directement
      };

      if (formData.decisionType === 'NUANCED_VOTE') {
        body.nuancedProposals = nuancedProposals.filter(p => p.title.trim() !== '');
      } else if (formData.decisionType === 'MAJORITY') {
        body.proposals = majorityProposals.filter(p => p.title.trim() !== '');
      }

      // Ajouter les participants
      if (formData.votingMode === 'INVITED') {
        body.participants = {
          teamIds: selectedTeams,
          memberIds: selectedMembers,
          externalParticipants: externalParticipants,
        };
      }

      const response = await fetch(`/api/organizations/${slug}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      const { decision } = data;

      refreshSidebar();

      // Rediriger vers la page de vote
      router.push(`/organizations/${slug}/decisions/${decision.id}/vote`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 24);
  const minDateString = minDate.toISOString().slice(0, 16);

  // Calculer le nombre total de participants sélectionnés
  const totalSelectedParticipants = selectedTeams.length + selectedMembers.length + externalParticipants.length;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {draftId ? 'Continuer le brouillon' : 'Nouvelle décision'}
      </Typography>

      {(error || validationErrors.length > 0) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error && <div>{error}</div>}
          {validationErrors.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Informations de base */}
        <TextField
          label="Titre de la décision"
          required
          fullWidth
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Choix du nouveau logo"
        />

        <TextField
          label="Description"
          required
          fullWidth
          multiline
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Décrivez le contexte et l'objet de la décision..."
        />

        <TextField
          label="Contexte additionnel (optionnel)"
          fullWidth
          multiline
          rows={3}
          value={formData.context}
          onChange={(e) => setFormData({ ...formData, context: e.target.value })}
          placeholder="Informations complémentaires, liens, documents..."
        />

        {/* Modalité décisionnelle */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Modalité décisionnelle *
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {['MAJORITY', 'CONSENSUS', 'NUANCED_VOTE', 'ADVICE_SOLICITATION'].map((type) => (
              <Tooltip
                key={type}
                title={DecisionTypeTooltips[type as DecisionType]}
                arrow
                placement="right"
              >
                <Box
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: formData.decisionType === type ? 'primary.main' : 'grey.300',
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: formData.decisionType === type ? 'primary.50' : 'transparent',
                    '&:hover': { bgcolor: 'grey.50' },
                  }}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      decisionType: type as DecisionType,
                      votingMode: type === 'ADVICE_SOLICITATION' ? 'INVITED' : formData.votingMode
                    });
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.decisionType === type}
                        onChange={() => {}}
                      />
                    }
                    label={DecisionTypeLabels[type as DecisionType]}
                  />
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Mode de participation (sauf ADVICE_SOLICITATION) */}
        {formData.decisionType !== 'ADVICE_SOLICITATION' && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Mode de participation *
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: formData.votingMode === 'INVITED' ? 'primary.main' : 'grey.300',
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: formData.votingMode === 'INVITED' ? 'primary.50' : 'transparent',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
                onClick={() => setFormData({ ...formData, votingMode: 'INVITED', publicSlug: '' })}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.votingMode === 'INVITED'}
                      onChange={() => {}}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Sur invitation
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vous invitez spécifiquement les participants (internes ou externes)
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: formData.votingMode === 'PUBLIC_LINK' ? 'primary.main' : 'grey.300',
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: formData.votingMode === 'PUBLIC_LINK' ? 'primary.50' : 'transparent',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
                onClick={() => setFormData({ ...formData, votingMode: 'PUBLIC_LINK' })}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.votingMode === 'PUBLIC_LINK'}
                      onChange={() => {}}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Vote anonyme via URL
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Créez un lien public que vous pouvez partager. Les votes sont anonymes.
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>

            {formData.votingMode === 'PUBLIC_LINK' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <TextField
                  label="Slug pour l'URL publique"
                  required
                  fullWidth
                  value={formData.publicSlug}
                  onChange={(e) => {
                    const normalized = normalizeSlug(e.target.value);
                    setFormData({ ...formData, publicSlug: normalized });
                    if (normalized.length >= 3) {
                      checkSlugAvailability(normalized);
                    } else {
                      setSlugAvailable(null);
                    }
                  }}
                  placeholder="mon-vote-2024"
                  helperText="Entre 3 et 50 caractères (lettres, chiffres, tirets uniquement)"
                />
                {formData.publicSlug && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      Aperçu : <strong>/public-vote/{slug}/{formData.publicSlug}</strong>
                    </Typography>
                    {checkingSlug && <Typography variant="body2" color="text.secondary">Vérification...</Typography>}
                    {!checkingSlug && slugAvailable === true && (
                      <Typography variant="body2" color="success.main">✓ Ce slug est disponible</Typography>
                    )}
                    {!checkingSlug && slugAvailable === false && (
                      <Typography variant="body2" color="error.main">✗ Ce slug est déjà utilisé</Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Champs spécifiques : Proposition initiale (CONSENSUS) */}
        {formData.decisionType === 'CONSENSUS' && (
          <TextField
            label="Proposition initiale"
            required
            fullWidth
            multiline
            rows={4}
            value={formData.initialProposal}
            onChange={(e) => setFormData({ ...formData, initialProposal: e.target.value })}
            placeholder="Décrivez votre proposition initiale pour le consensus..."
          />
        )}

        {/* Champs spécifiques : Proposition de décision (ADVICE_SOLICITATION) */}
        {formData.decisionType === 'ADVICE_SOLICITATION' && (
          <TextField
            label="Proposition de décision"
            required
            fullWidth
            multiline
            rows={6}
            value={formData.initialProposal}
            onChange={(e) => setFormData({ ...formData, initialProposal: e.target.value })}
            placeholder="Partagez votre intention de décision avant de solliciter l'avis de personnes compétentes..."
            helperText="Décrivez clairement votre intention afin que les personnes sollicitées puissent vous donner un avis éclairé."
          />
        )}

        {/* Champs spécifiques : Propositions MAJORITY */}
        {formData.decisionType === 'MAJORITY' && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Propositions à soumettre au vote
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Minimum 2, maximum 25
            </Typography>
            {majorityProposals.map((proposal, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Proposition {index + 1}</Typography>
                  {majorityProposals.length > 2 && (
                    <IconButton size="small" color="error" onClick={() => removeMajorityProposal(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Titre de la proposition"
                  value={proposal.title}
                  onChange={(e) => updateMajorityProposal(index, 'title', e.target.value)}
                  required={index < 2}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Description (optionnelle)"
                  value={proposal.description}
                  onChange={(e) => updateMajorityProposal(index, 'description', e.target.value)}
                />
              </Box>
            ))}
            {majorityProposals.length < 25 && (
              <Button startIcon={<AddIcon />} onClick={addMajorityProposal}>
                Ajouter une proposition
              </Button>
            )}
          </Box>
        )}

        {/* Champs spécifiques : NUANCED_VOTE */}
        {formData.decisionType === 'NUANCED_VOTE' && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuration du vote nuancé
            </Typography>

            <TextField
              select
              label="Échelle de mentions"
              required
              fullWidth
              value={formData.nuancedScale}
              onChange={(e) => setFormData({ ...formData, nuancedScale: e.target.value as NuancedScale })}
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="3_LEVELS">{NuancedScaleLabels['3_LEVELS']} (Pour / Sans avis / Contre)</option>
              <option value="5_LEVELS">{NuancedScaleLabels['5_LEVELS']}</option>
              <option value="7_LEVELS">{NuancedScaleLabels['7_LEVELS']}</option>
            </TextField>

            <TextField
              type="number"
              label="Nombre de propositions gagnantes"
              required
              fullWidth
              value={formData.nuancedWinnerCount}
              onChange={(e) => setFormData({ ...formData, nuancedWinnerCount: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1, max: 25 }}
              helperText="Combien de propositions souhaitez-vous désigner comme gagnantes ?"
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle1" gutterBottom>
              Propositions (minimum 2, maximum 25)
            </Typography>
            {nuancedProposals.map((proposal, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Proposition {index + 1}</Typography>
                  {nuancedProposals.length > 2 && (
                    <IconButton size="small" color="error" onClick={() => removeNuancedProposal(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Titre de la proposition"
                  value={proposal.title}
                  onChange={(e) => updateNuancedProposal(index, 'title', e.target.value)}
                  required={index < 2}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Description (optionnelle)"
                  value={proposal.description}
                  onChange={(e) => updateNuancedProposal(index, 'description', e.target.value)}
                />
              </Box>
            ))}
            {nuancedProposals.length < 25 && (
              <Button startIcon={<AddIcon />} onClick={addNuancedProposal}>
                Ajouter une proposition
              </Button>
            )}
          </Box>
        )}

        {/* Sélection des participants (mode INVITED uniquement) */}
        {formData.votingMode === 'INVITED' && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Participants *
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {totalSelectedParticipants} participant(s) sélectionné(s)
              {formData.decisionType === 'ADVICE_SOLICITATION' && totalMemberCount === 1 &&
                ' (vous devez inviter au moins 1 personne externe)'}
              {formData.decisionType === 'ADVICE_SOLICITATION' && totalMemberCount >= 2 && totalMemberCount <= 4 &&
                ' (minimum 1 requis)'}
              {formData.decisionType === 'ADVICE_SOLICITATION' && totalMemberCount >= 5 &&
                ' (minimum 3 requis)'}
            </Typography>

            {/* Sélection par équipes */}
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <GroupsIcon sx={{ mr: 1 }} />
                <Typography>Inviter par équipes ({selectedTeams.length} sélectionnée(s))</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {teams.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aucune équipe dans cette organisation
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {teams.map((team) => (
                      <FormControlLabel
                        key={team.id}
                        control={
                          <Checkbox
                            checked={selectedTeams.includes(team.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeams([...selectedTeams, team.id]);
                              } else {
                                setSelectedTeams(selectedTeams.filter((id) => id !== team.id));
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{team.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {team._count.members} membre(s)
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Sélection individuelle */}
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <PersonIcon sx={{ mr: 1 }} />
                <Typography>Inviter individuellement ({selectedMembers.length} sélectionné(s))</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {members.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aucun autre membre dans cette organisation
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {members.map((member) => (
                      <FormControlLabel
                        key={member.id}
                        control={
                          <Checkbox
                            checked={selectedMembers.includes(member.userId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMembers([...selectedMembers, member.userId]);
                              } else {
                                setSelectedMembers(selectedMembers.filter((id) => id !== member.userId));
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{member.user.name || 'Sans nom'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.user.email}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Participants externes */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <EmailIcon sx={{ mr: 1 }} />
                <Typography>Inviter des personnes externes ({externalParticipants.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Ajoutez des personnes externes par email (elles ne seront pas membres de l'organisation)
                </Typography>

                {externalParticipants.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    {externalParticipants.map((participant, index) => (
                      <Chip
                        key={index}
                        label={`${participant.name} (${participant.email})`}
                        onDelete={() => removeExternalParticipant(index)}
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Nom complet"
                    value={newExternalName}
                    onChange={(e) => setNewExternalName(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    type="email"
                    placeholder="Email"
                    value={newExternalEmail}
                    onChange={(e) => setNewExternalEmail(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                </Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addExternalParticipant}
                  disabled={!newExternalName || !newExternalEmail}
                >
                  Ajouter
                </Button>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {/* Date limite (sauf ADVICE_SOLICITATION) */}
        {formData.decisionType !== 'ADVICE_SOLICITATION' && (
          <TextField
            type="datetime-local"
            label={`Date de fin ${formData.decisionType === 'CONSENSUS' ? 'prévisionnelle' : ''}`}
            required
            fullWidth
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: minDateString }}
            helperText="Doit être au moins 24h dans le futur"
          />
        )}

        {/* Boutons d'action */}
        {lastSavedAt && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
            Sauvegardé à {lastSavedAt.toLocaleTimeString()}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
          <Button variant="outlined" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button
            variant="outlined"
            startIcon={savingDraft ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleSaveDraft}
            disabled={savingDraft || !formData.title.trim()}
          >
            {savingDraft ? 'Sauvegarde...' : 'Enregistrer en brouillon'}
          </Button>
          <Button
            variant="contained"
            onClick={handleLaunch}
            disabled={loading}
          >
            {loading ? 'Lancement...' : 'Lancer la décision'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
