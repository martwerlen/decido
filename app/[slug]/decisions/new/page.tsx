'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  DecisionTypeLabels,
  NuancedScaleLabels
} from '@/types/enums';
import { useSidebarRefresh } from '@/components/providers/SidebarRefreshProvider';
import { Tooltip, CircularProgress, Checkbox, Box, Alert, Chip, Typography } from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

type DecisionType = 'MAJORITY' | 'CONSENSUS' | 'CONSENT' | 'NUANCED_VOTE' | 'ADVICE_SOLICITATION';
type NuancedScale = '3_LEVELS' | '5_LEVELS' | '7_LEVELS';
type ConsentStepMode = 'MERGED' | 'DISTINCT';

// Descriptions courtes pour les tooltips
const DecisionTypeTooltips: Record<DecisionType, string> = {
  CONSENSUS: "Échanger ensemble pour tomber tous d'accord",
  CONSENT: "Faites évoluer la proposition grâce au retour du groupe et allez de l'avant tant que personne n'a d'objection majeure",
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
  teamMembers: Array<{
    team: {
      id: string;
      name: string;
    };
  }>;
}

export default function NewDecisionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { refreshSidebar } = useSidebarRefresh();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [error, setError] = useState('');

  // Teams et membres
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    decisionType: 'MAJORITY' as DecisionType,
    initialProposal: '',
    endDate: '',
    // Mode de vote
    votingMode: 'INVITED' as 'INVITED' | 'PUBLIC_LINK',
    publicSlug: '',
    // Pour le vote nuancé
    nuancedScale: '5_LEVELS' as NuancedScale,
    nuancedWinnerCount: 1,
    // Pour le consentement
    consentStepMode: 'DISTINCT' as ConsentStepMode,
  });

  const [nuancedProposals, setNuancedProposals] = useState<NuancedProposal[]>([
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  const [majorityProposals, setMajorityProposals] = useState<NuancedProposal[]>([
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Draft state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Participants state
  const [participantMode, setParticipantMode] = useState<'teams' | 'external'>('teams');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [expandedTeamIds, setExpandedTeamIds] = useState<string[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<Array<{ email: string; name: string }>>([]);
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');

  // Normaliser et valider le slug
  const normalizeSlug = (input: string): string => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  };

  // Vérifier la disponibilité du slug
  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      const response = await fetch(
        `/api/${slug}/decisions/check-public-slug?slug=${encodeURIComponent(formData.publicSlug)}`
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

  // ===== FONCTIONS HELPERS POUR LA SÉLECTION DES PARTICIPANTS =====

  // Obtenir tous les membres d'une équipe
  const getTeamMembers = (teamId: string): Member[] => {
    return members.filter(member =>
      member.teamMembers.some(tm => tm.team.id === teamId)
    );
  };

  // Obtenir les membres sans équipe
  const getMembersWithoutTeam = (): Member[] => {
    return members.filter(member => member.teamMembers.length === 0);
  };

  // Filtrer l'utilisateur connecté si nécessaire (ADVICE_SOLICITATION)
  const getFilteredMembers = (): Member[] => {
    if (formData.decisionType === 'ADVICE_SOLICITATION' && session?.user?.id) {
      return members.filter(m => m.userId !== session.user.id);
    }
    return members;
  };

  // Filtrer les équipes pour ne garder que celles avec des membres filtrés
  const getFilteredTeams = (): Team[] => {
    const filteredMemberIds = new Set(getFilteredMembers().map(m => m.id));
    return teams.filter(team => {
      const teamMembers = getTeamMembers(team.id);
      // Garder l'équipe si elle a au moins un membre filtré
      return teamMembers.some(m => filteredMemberIds.has(m.id));
    });
  };

  // Vérifier si un user est sélectionné (via équipe OU individuellement)
  const isUserSelected = (userId: string): boolean => {
    // Vérifier si sélectionné individuellement
    if (selectedUserIds.includes(userId)) {
      return true;
    }

    // Vérifier si sélectionné via une équipe
    const member = members.find(m => m.userId === userId);
    if (!member) return false;

    return member.teamMembers.some(tm =>
      selectedTeamIds.includes(tm.team.id)
    );
  };

  // Obtenir l'état de la checkbox d'une équipe
  const getTeamCheckboxState = (teamId: string): 'checked' | 'indeterminate' | 'unchecked' => {
    const teamMembers = getTeamMembers(teamId);
    const filteredMemberIds = new Set(getFilteredMembers().map(m => m.id));
    const filteredTeamMembers = teamMembers.filter(m => filteredMemberIds.has(m.id));

    if (filteredTeamMembers.length === 0) return 'unchecked';

    const selectedCount = filteredTeamMembers.filter(m => isUserSelected(m.userId)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === filteredTeamMembers.length) return 'checked';
    return 'indeterminate';
  };

  // Obtenir tous les users sélectionnés (pour envoi à l'API)
  const getEffectiveSelectedUsers = (): string[] => {
    const result = new Set<string>();

    // Ajouter les users sélectionnés individuellement
    selectedUserIds.forEach(id => result.add(id));

    // Ajouter les users des équipes sélectionnées
    selectedTeamIds.forEach(teamId => {
      const teamMembers = getTeamMembers(teamId);
      teamMembers.forEach(m => result.add(m.userId));
    });

    return Array.from(result);
  };

  // Toggle une équipe
  const toggleTeam = (teamId: string) => {
    const state = getTeamCheckboxState(teamId);
    const teamMembers = getTeamMembers(teamId);
    const filteredMemberIds = new Set(getFilteredMembers().map(m => m.id));
    const filteredTeamMembers = teamMembers.filter(m => filteredMemberIds.has(m.id));

    if (state === 'unchecked' || state === 'indeterminate') {
      // Cocher l'équipe : ajouter teamId, retirer les membres individuels de cette équipe
      setSelectedTeamIds([...selectedTeamIds, teamId]);
      setSelectedUserIds(selectedUserIds.filter(userId =>
        !filteredTeamMembers.some(m => m.userId === userId)
      ));
    } else {
      // Décocher l'équipe : retirer teamId et tous ses membres
      setSelectedTeamIds(selectedTeamIds.filter(id => id !== teamId));
      setSelectedUserIds(selectedUserIds.filter(userId =>
        !filteredTeamMembers.some(m => m.userId === userId)
      ));
    }
  };

  // Toggle un user
  const toggleUser = (userId: string) => {
    const member = members.find(m => m.userId === userId);
    if (!member) return;

    if (isUserSelected(userId)) {
      // Décocher : retirer de selectedUserIds et de toutes les équipes sélectionnées
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
      // Retirer l'utilisateur des équipes sélectionnées (décocher les équipes qui le contiennent)
      const userTeamIds = member.teamMembers.map(tm => tm.team.id);
      setSelectedTeamIds(selectedTeamIds.filter(teamId => !userTeamIds.includes(teamId)));
    } else {
      // Cocher : ajouter à selectedUserIds
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  // Toggle l'expansion d'une équipe
  const toggleTeamExpansion = (teamId: string) => {
    if (expandedTeamIds.includes(teamId)) {
      setExpandedTeamIds(expandedTeamIds.filter(id => id !== teamId));
    } else {
      setExpandedTeamIds([...expandedTeamIds, teamId]);
    }
  };

  // Charger les teams et members
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch teams
        const teamsRes = await fetch(`/api/${slug}/teams`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData || []); // API retourne directement le tableau
        }

        // Fetch members
        const membersRes = await fetch(`/api/${slug}/members`);
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData.members || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [slug]);

  // Pré-sélectionner l'utilisateur connecté (sauf pour ADVICE_SOLICITATION)
  useEffect(() => {
    if (
      session?.user?.id &&
      members.length > 0 &&
      formData.decisionType !== 'ADVICE_SOLICITATION' &&
      formData.votingMode === 'INVITED' &&
      !selectedUserIds.includes(session.user.id) &&
      !draftId // Ne pas pré-sélectionner si on reprend un brouillon
    ) {
      // Vérifier que l'utilisateur est bien dans les membres
      const currentUserMember = members.find(m => m.userId === session.user.id);
      if (currentUserMember) {
        setSelectedUserIds([session.user.id]);
      }
    }
  }, [session, members, formData.decisionType, formData.votingMode, draftId]);

  // Sauvegarder manuellement le brouillon
  const handleManualSave = async () => {
    // Ne sauvegarder que si on a au moins un titre
    if (!formData.title.trim()) {
      setError('Le titre est requis pour sauvegarder un brouillon');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      if (!draftId) {
        // Créer un nouveau brouillon
        const body: any = { ...formData };
        if (formData.decisionType === 'NUANCED_VOTE') {
          body.nuancedProposals = nuancedProposals.filter(p => p.title.trim() !== '');
        } else if (formData.decisionType === 'MAJORITY') {
          body.proposals = majorityProposals.filter(p => p.title.trim() !== '');
        }

        const response = await fetch(`/api/${slug}/decisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          setDraftId(data.decision.id);
          setLastSavedAt(new Date());
          refreshSidebar(); // Rafraîchir la sidebar pour afficher la section "Brouillons"
        } else {
          const data = await response.json();
          setError(data.error || 'Erreur lors de la sauvegarde');
        }
      } else {
        // Mettre à jour le brouillon existant
        const body: any = { ...formData };

        const response = await fetch(`/api/${slug}/decisions/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          setLastSavedAt(new Date());
          refreshSidebar(); // Rafraîchir la sidebar pour mettre à jour le compteur de brouillons
        } else {
          const data = await response.json();
          setError(data.error || 'Erreur lors de la sauvegarde');
        }
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Erreur lors de la sauvegarde du brouillon');
    } finally {
      setIsSaving(false);
    }
  };

  // Charger le brouillon si paramètre draft présent
  useEffect(() => {
    const draftId = searchParams.get('draft');
    if (draftId) {
      setLoadingDraft(true);
      fetch(`/api/${slug}/decisions/${draftId}`)
        .then(res => res.json())
        .then(data => {
          if (data.decision) {
            const decision = data.decision;

            // Pré-remplir le formulaire
            setFormData({
              title: decision.title || '',
              description: decision.description || '',
              decisionType: decision.decisionType || 'MAJORITY',
              initialProposal: decision.initialProposal || '',
              endDate: decision.endDate ? new Date(decision.endDate).toISOString().slice(0, 16) : '',
              votingMode: decision.votingMode || 'INVITED',
              publicSlug: decision.publicSlug || '',
              nuancedScale: decision.nuancedScale || '5_LEVELS',
              nuancedWinnerCount: decision.nuancedWinnerCount || 1,
            });

            // Charger les propositions si MAJORITY
            if (decision.decisionType === 'MAJORITY' && decision.proposals && decision.proposals.length > 0) {
              const sortedProposals = [...decision.proposals].sort((a: any, b: any) => a.order - b.order);
              setMajorityProposals(sortedProposals.map((p: any) => ({
                title: p.title || '',
                description: p.description || '',
              })));
            }

            // Charger les propositions si NUANCED_VOTE
            if (decision.decisionType === 'NUANCED_VOTE' && decision.nuancedProposals && decision.nuancedProposals.length > 0) {
              const sortedProposals = [...decision.nuancedProposals].sort((a: any, b: any) => a.order - b.order);
              setNuancedProposals(sortedProposals.map((p: any) => ({
                title: p.title || '',
                description: p.description || '',
              })));
            }

            // Définir le draftId
            setDraftId(draftId);
            setLastSavedAt(new Date(decision.updatedAt));
          }
        })
        .catch(err => {
          console.error('Error loading draft:', err);
          setError('Impossible de charger le brouillon');
        })
        .finally(() => {
          setLoadingDraft(false);
        });
    }
  }, [searchParams, slug]);

  // Calculer le nombre minimum de participants pour ADVICE_SOLICITATION
  const getMinimumParticipants = (): number => {
    if (formData.decisionType !== 'ADVICE_SOLICITATION') return 0;

    const memberCount = members.length;
    if (memberCount === 1) return 1; // 1 membre = 1 externe minimum
    if (memberCount >= 2 && memberCount <= 4) return 1; // 2-4 membres = 1 min
    if (memberCount >= 5) return 3; // 5+ membres = 3 min
    return 1;
  };

  const minimumParticipants = getMinimumParticipants();

  // Calculer le nombre total de participants sélectionnés
  const getTotalParticipants = (): { internal: number; external: number; total: number } => {
    let internalCount = getEffectiveSelectedUsers().length;
    const externalCount = externalParticipants.length;

    // Pour ADVICE_SOLICITATION, exclure le créateur du compteur
    if (formData.decisionType === 'ADVICE_SOLICITATION' && session?.user?.id) {
      const effectiveUsers = getEffectiveSelectedUsers();
      if (effectiveUsers.includes(session.user.id)) {
        internalCount -= 1;
      }
    }

    return {
      internal: internalCount,
      external: externalCount,
      total: internalCount + externalCount,
    };
  };

  // Ajouter un participant externe à la liste
  const handleAddExternalParticipant = () => {
    if (!externalEmail || !externalName) {
      setError('Email et nom sont requis pour les participants externes');
      return;
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(externalEmail)) {
      setError('Veuillez saisir une adresse email valide');
      return;
    }

    // Vérifier que l'email n'est pas déjà dans la liste
    if (externalParticipants.some(p => p.email === externalEmail)) {
      setError('Cet email est déjà dans la liste');
      return;
    }

    setExternalParticipants([...externalParticipants, { email: externalEmail, name: externalName }]);
    setExternalEmail('');
    setExternalName('');
    setError('');
  };

  // Supprimer un participant externe
  const handleRemoveExternalParticipant = (email: string) => {
    setExternalParticipants(externalParticipants.filter(p => p.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation du mode PUBLIC_LINK
      if (formData.votingMode === 'PUBLIC_LINK') {
        if (!formData.publicSlug || formData.publicSlug.length < 3) {
          setError('Le slug doit contenir au moins 3 caractères');
          setLoading(false);
          return;
        }
        if (slugAvailable === false) {
          setError('Ce slug est déjà utilisé. Veuillez en choisir un autre.');
          setLoading(false);
          return;
        }
      }

      // Vérifier que endDate est au moins 24h dans le futur (sauf ADVICE_SOLICITATION)
      // Pour CONSENT, la durée minimale est de 7 jours
      if (formData.decisionType !== 'ADVICE_SOLICITATION' && formData.endDate) {
        const endDate = new Date(formData.endDate);
        const minDate = new Date();

        if (formData.decisionType === 'CONSENT') {
          minDate.setDate(minDate.getDate() + 7);
          if (endDate < minDate) {
            setError('La durée minimale d\'une décision par consentement est de 7 jours');
            setLoading(false);
            return;
          }
        } else {
          minDate.setHours(minDate.getHours() + 24);
          if (endDate < minDate) {
            setError('La date de fin doit être au moins 24h dans le futur');
            setLoading(false);
            return;
          }
        }
      }

      // Validation spécifique au vote nuancé
      if (formData.decisionType === 'NUANCED_VOTE') {
        const validProposals = nuancedProposals.filter(p => p.title.trim() !== '');
        if (validProposals.length < 2) {
          setError('Vous devez avoir au moins 2 propositions pour le vote nuancé');
          setLoading(false);
          return;
        }
        if (formData.nuancedWinnerCount > validProposals.length) {
          setError('Le nombre de gagnants ne peut pas dépasser le nombre de propositions');
          setLoading(false);
          return;
        }
      }

      // Validation spécifique au vote à la majorité
      if (formData.decisionType === 'MAJORITY') {
        const validProposals = majorityProposals.filter(p => p.title.trim() !== '');
        if (validProposals.length < 2) {
          setError('Vous devez avoir au moins 2 propositions pour le vote à la majorité');
          setLoading(false);
          return;
        }
      }

      // Validation des participants (mode INVITED uniquement)
      if (formData.votingMode === 'INVITED') {
        const { total: totalParticipants } = getTotalParticipants();

        if (totalParticipants === 0) {
          setError('Vous devez ajouter au moins un participant');
          setLoading(false);
          return;
        }

        // Validation spécifique pour ADVICE_SOLICITATION
        if (formData.decisionType === 'ADVICE_SOLICITATION') {
          if (totalParticipants < minimumParticipants) {
            setError(`Vous devez solliciter au moins ${minimumParticipants} personne(s) pour une sollicitation d'avis`);
            setLoading(false);
            return;
          }
        }
      }

      // Préparer le body avec les propositions si nécessaire
      const body: any = {
        ...formData,
        launch: true, // Toujours lancer la décision depuis /new
      };

      if (formData.decisionType === 'NUANCED_VOTE') {
        body.nuancedProposals = nuancedProposals.filter(p => p.title.trim() !== '');
      } else if (formData.decisionType === 'MAJORITY') {
        body.proposals = majorityProposals.filter(p => p.title.trim() !== '');
      }

      // Ajouter les participants (mode INVITED uniquement)
      if (formData.votingMode === 'INVITED') {
        body.teamIds = selectedTeamIds;
        body.userIds = selectedUserIds;
        body.externalParticipants = externalParticipants;
      }

      const response = await fetch(`/api/${slug}/decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('API Response:', { ok: response.ok, status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      if (!data.decision || !data.decision.id) {
        console.error('Invalid response:', data);
        throw new Error('Réponse invalide du serveur');
      }

      const { decision } = data;

      // Actualiser la sidebar pour afficher la nouvelle décision
      refreshSidebar();

      // Rediriger selon le mode de vote
      if (formData.votingMode === 'PUBLIC_LINK') {
        console.log('Redirecting to:', `/${slug}/decisions/${decision.id}/share`);
        router.push(`/${slug}/decisions/${decision.id}/share`);
      } else {
        // Mode INVITED : vérifier si le créateur est participant
        // On redirige vers /vote s'il est participant, sinon vers /admin
        // Note : le backend ajoute automatiquement le créateur comme participant
        console.log('Redirecting to:', `/${slug}/decisions/${decision.id}/vote`);
        router.push(`/${slug}/decisions/${decision.id}/vote`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
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

  // Calcul de la date minimale (24h dans le futur, 7 jours pour CONSENT)
  const minDate = new Date();
  if (formData.decisionType === 'CONSENT') {
    minDate.setDate(minDate.getDate() + 7);
  } else {
    minDate.setHours(minDate.getHours() + 24);
  }
  const minDateString = minDate.toISOString().slice(0, 16);

  // Afficher un spinner pendant le chargement du brouillon ou des données
  if (loadingDraft || loadingData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <CircularProgress />
          <Typography color="text.secondary">Chargement...</Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {draftId ? 'Continuer le brouillon' : 'Nouvelle décision'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titre */}
        <div>
          <label htmlFor="title" className="block font-medium mb-2">
            Titre de la décision *
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Choix du nouveau logo"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block font-medium mb-2">
            Contexte et enjeux *
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Décrivez le contexte et les enjeux"
          />
        </div>

        {/* Mode de vote - masqué pour ADVICE_SOLICITATION et CONSENT */}
        {formData.decisionType !== 'ADVICE_SOLICITATION' && formData.decisionType !== 'CONSENT' && (
          <div className="border-t pt-6">
            <label className="block font-medium mb-3">
              Mode de participation *
            </label>
            <div className="space-y-3">
              <Box
                component="label"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <input
                  type="radio"
                  name="votingMode"
                  value="INVITED"
                  checked={formData.votingMode === 'INVITED'}
                  onChange={(e) => setFormData({ ...formData, votingMode: 'INVITED', publicSlug: '' })}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium">Sur invitation</div>
                  <Typography variant="body2" color="text.secondary">
                    Vous invitez spécifiquement les participants (internes ou externes). Vous gérez la liste des votants.
                  </Typography>
                </div>
              </Box>

              <Box
                component="label"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <input
                  type="radio"
                  name="votingMode"
                  value="PUBLIC_LINK"
                  checked={formData.votingMode === 'PUBLIC_LINK'}
                  onChange={(e) => setFormData({ ...formData, votingMode: 'PUBLIC_LINK' })}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium">Vote anonyme via URL</div>
                  <Typography variant="body2" color="text.secondary">
                    Créez un lien public que vous pouvez partager. Les votes sont anonymes.
                  </Typography>
                </div>
              </Box>
            </div>

          {/* Champ publicSlug si mode PUBLIC_LINK */}
          {formData.votingMode === 'PUBLIC_LINK' && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-primary-lighter)', border: '1px solid var(--color-primary-light)' }}>
              <label htmlFor="publicSlug" className="block font-medium mb-2">
                Slug pour l'URL publique *
              </label>
              <input
                type="text"
                id="publicSlug"
                required
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
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="mon-vote-2024"
                minLength={3}
                maxLength={50}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Le slug doit contenir entre 3 et 50 caractères (lettres, chiffres, tirets uniquement).
              </Typography>
              {formData.publicSlug && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Aperçu de l'URL : <Typography component="span" color="primary" fontWeight="medium">/public-vote/{slug}/{formData.publicSlug}</Typography>
                  </Typography>
                  {checkingSlug && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Vérification...</Typography>}
                  {!checkingSlug && slugAvailable === true && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>✓ Ce slug est disponible</Typography>
                  )}
                  {!checkingSlug && slugAvailable === false && (
                    <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>✗ Ce slug est déjà utilisé</Typography>
                  )}
                </Box>
              )}
            </div>
          )}
          </div>
        )}

        {/* Type de décision */}
        <div>
          <label className="block font-medium mb-2">
            Modalité décisionnelle *
          </label>
          <div className="space-y-3">
            <Tooltip
              title={DecisionTypeTooltips.MAJORITY}
              arrow
              placement="right"
            >
              <Box
                component="label"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <input
                  type="radio"
                  name="decisionType"
                  value="MAJORITY"
                  checked={formData.decisionType === 'MAJORITY'}
                  onChange={(e) => setFormData({ ...formData, decisionType: 'MAJORITY' })}
                  className="mt-1 mr-3"
                />
                <div className="font-medium">{DecisionTypeLabels.MAJORITY}</div>
              </Box>
            </Tooltip>

            <Tooltip
              title={DecisionTypeTooltips.CONSENSUS}
              arrow
              placement="right"
            >
              <Box
                component="label"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <input
                  type="radio"
                  name="decisionType"
                  value="CONSENSUS"
                  checked={formData.decisionType === 'CONSENSUS'}
                  onChange={(e) => setFormData({ ...formData, decisionType: 'CONSENSUS' })}
                  className="mt-1 mr-3"
                />
                <div className="font-medium">{DecisionTypeLabels.CONSENSUS}</div>
              </Box>
            </Tooltip>

            {/* Masquer CONSENT si PUBLIC_LINK est sélectionné */}
            {formData.votingMode !== 'PUBLIC_LINK' && (
              <Tooltip
                title={DecisionTypeTooltips.CONSENT}
                arrow
                placement="right"
              >
                <Box
                  component="label"
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <input
                    type="radio"
                    name="decisionType"
                    value="CONSENT"
                    checked={formData.decisionType === 'CONSENT'}
                    onChange={(e) => setFormData({ ...formData, decisionType: 'CONSENT', votingMode: 'INVITED' })}
                    className="mt-1 mr-3"
                  />
                  <div className="font-medium">{DecisionTypeLabels.CONSENT}</div>
                </Box>
              </Tooltip>
            )}

            <Tooltip
              title={DecisionTypeTooltips.NUANCED_VOTE}
              arrow
              placement="right"
            >
              <Box
                component="label"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <input
                  type="radio"
                  name="decisionType"
                  value="NUANCED_VOTE"
                  checked={formData.decisionType === 'NUANCED_VOTE'}
                  onChange={(e) => setFormData({ ...formData, decisionType: 'NUANCED_VOTE' })}
                  className="mt-1 mr-3"
                />
                <div className="font-medium">{DecisionTypeLabels.NUANCED_VOTE}</div>
              </Box>
            </Tooltip>

            {/* Masquer ADVICE_SOLICITATION si PUBLIC_LINK est sélectionné */}
            {formData.votingMode !== 'PUBLIC_LINK' && (
              <Tooltip
                title={DecisionTypeTooltips.ADVICE_SOLICITATION}
                arrow
                placement="right"
              >
                <Box
                  component="label"
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <input
                    type="radio"
                    name="decisionType"
                    value="ADVICE_SOLICITATION"
                    checked={formData.decisionType === 'ADVICE_SOLICITATION'}
                    onChange={(e) => setFormData({ ...formData, decisionType: 'ADVICE_SOLICITATION', votingMode: 'INVITED' })}
                    className="mt-1 mr-3"
                  />
                  <div className="font-medium">{DecisionTypeLabels.ADVICE_SOLICITATION}</div>
                </Box>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Propositions (uniquement pour MAJORITY) */}
        {formData.decisionType === 'MAJORITY' && (
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-semibold">Propositions à soumettre au vote</h3>

            <div>
              <label className="block font-medium mb-2">
                Propositions * (minimum 2, maximum 25)
              </label>
              <div className="space-y-4">
                {majorityProposals.map((proposal, index) => (
                  <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: 'background.secondary' }}>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Proposition {index + 1}</h4>
                      {majorityProposals.length > 2 && (
                        <Box
                          component="button"
                          type="button"
                          onClick={() => removeMajorityProposal(index)}
                          sx={{ color: 'error.main', '&:hover': { color: 'error.dark' }, fontSize: '0.875rem', border: 0, background: 'transparent', cursor: 'pointer' }}
                        >
                          Supprimer
                        </Box>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={proposal.title}
                        onChange={(e) => updateMajorityProposal(index, 'title', e.target.value)}
                        placeholder="Titre de la proposition"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={index < 2}
                      />
                      <textarea
                        value={proposal.description}
                        onChange={(e) => updateMajorityProposal(index, 'description', e.target.value)}
                        placeholder="Description (optionnelle)"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </Box>
                ))}
              </div>
              {majorityProposals.length < 25 && (
                <button
                  type="button"
                  onClick={addMajorityProposal}
                  className="mt-3 px-4 py-2 border rounded-lg"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-lighter)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  + Ajouter une proposition
                </button>
              )}
            </div>
          </div>
        )}

        {/* Proposition initiale (uniquement pour consensus) */}
        {formData.decisionType === 'CONSENSUS' && (
          <div>
            <label htmlFor="initialProposal" className="block font-medium mb-2">
              Proposition initiale *
            </label>
            <textarea
              id="initialProposal"
              required
              rows={4}
              value={formData.initialProposal}
              onChange={(e) => setFormData({ ...formData, initialProposal: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez votre proposition initiale pour le consensus..."
            />
          </div>
        )}

        {/* Configuration pour le consentement */}
        {formData.decisionType === 'CONSENT' && (
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-semibold">Configuration de la décision par consentement</h3>

            {/* Proposition initiale */}
            <div>
              <label htmlFor="initialProposal" className="block font-medium mb-2">
                Proposition initiale *
              </label>
              <textarea
                id="initialProposal"
                required
                rows={4}
                value={formData.initialProposal}
                onChange={(e) => setFormData({ ...formData, initialProposal: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez votre proposition initiale..."
              />
            </div>

            {/* Choix du mode d'étapes */}
            <div>
              <label className="block font-medium mb-2">
                Déroulement des étapes *
              </label>
              <div className="space-y-3">
                <Box
                  component="label"
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <input
                    type="radio"
                    name="consentStepMode"
                    value="DISTINCT"
                    checked={formData.consentStepMode === 'DISTINCT'}
                    onChange={(e) => setFormData({ ...formData, consentStepMode: 'DISTINCT' })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium">Clarifications et avis distincts (recommandé)</div>
                    <Typography variant="body2" color="text.secondary">
                      Les questions de clarification et les avis sont traités séparément pour plus de structure
                    </Typography>
                  </div>
                </Box>

                <Box
                  component="label"
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <input
                    type="radio"
                    name="consentStepMode"
                    value="MERGED"
                    checked={formData.consentStepMode === 'MERGED'}
                    onChange={(e) => setFormData({ ...formData, consentStepMode: 'MERGED' })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium">Clarifications et avis mélangés</div>
                    <Typography variant="body2" color="text.secondary">
                      Les questions de clarification et les avis peuvent être donnés en même temps
                    </Typography>
                  </div>
                </Box>
              </div>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                ℹ️ La décision se découpe en 4 étapes : 1/3 du temps pour les questions de clarification, 1/3 du temps pour les avis, 1/3 du temps pour l'évolution de la proposition et la possibilité d'émettre une objection
              </Typography>
            </div>
          </div>
        )}

        {/* Proposition de décision (uniquement pour ADVICE_SOLICITATION) */}
        {formData.decisionType === 'ADVICE_SOLICITATION' && (
          <div>
            <label htmlFor="initialProposal" className="block font-medium mb-2">
              Intention de décision *
            </label>
            <textarea
              id="initialProposal"
              required
              rows={6}
              value={formData.initialProposal}
              onChange={(e) => setFormData({ ...formData, initialProposal: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Partagez votre intention de décision avant de solliciter l'avis de personnes compétentes..."
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Décrivez clairement votre intention afin que les personnes sollicitées puissent vous donner un avis éclairé.
            </Typography>
          </div>
        )}

        {/* Configuration du vote nuancé (uniquement pour NUANCED_VOTE) */}
        {formData.decisionType === 'NUANCED_VOTE' && (
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-semibold">Configuration du vote nuancé</h3>

            {/* Échelle de mentions */}
            <div>
              <label htmlFor="nuancedScale" className="block font-medium mb-2">
                Échelle de mentions *
              </label>
              <select
                id="nuancedScale"
                value={formData.nuancedScale}
                onChange={(e) => setFormData({ ...formData, nuancedScale: e.target.value as NuancedScale })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3_LEVELS">{NuancedScaleLabels['3_LEVELS']} (Pour / Sans avis / Contre)</option>
                <option value="5_LEVELS">{NuancedScaleLabels['5_LEVELS']} (Franchement pour / Pour / Sans avis / Contre / Franchement contre)</option>
                <option value="7_LEVELS">{NuancedScaleLabels['7_LEVELS']} (Absolument pour / Franchement pour / Pour / Sans avis / Contre / Franchement contre / Absolument contre)</option>
              </select>
            </div>

            {/* Nombre de gagnants */}
            <div>
              <label htmlFor="nuancedWinnerCount" className="block font-medium mb-2">
                Nombre de propositions gagnantes *
              </label>
              <input
                type="number"
                id="nuancedWinnerCount"
                min="1"
                max="25"
                value={formData.nuancedWinnerCount}
                onChange={(e) => setFormData({ ...formData, nuancedWinnerCount: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Combien de propositions souhaitez-vous désigner comme gagnantes ?
              </Typography>
            </div>


            {/* Propositions */}
            <div>
              <label className="block font-medium mb-2">
                Propositions * (minimum 2, maximum 25)
              </label>
              <div className="space-y-4">
                {nuancedProposals.map((proposal, index) => (
                  <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: 'background.secondary' }}>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Proposition {index + 1}</h4>
                      {nuancedProposals.length > 2 && (
                        <Box
                          component="button"
                          type="button"
                          onClick={() => removeNuancedProposal(index)}
                          sx={{ color: 'error.main', '&:hover': { color: 'error.dark' }, fontSize: '0.875rem', border: 0, background: 'transparent', cursor: 'pointer' }}
                        >
                          Supprimer
                        </Box>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={proposal.title}
                        onChange={(e) => updateNuancedProposal(index, 'title', e.target.value)}
                        placeholder="Titre de la proposition"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={index < 2}
                      />
                      <textarea
                        value={proposal.description}
                        onChange={(e) => updateNuancedProposal(index, 'description', e.target.value)}
                        placeholder="Description (optionnelle)"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </Box>
                ))}
              </div>
              {nuancedProposals.length < 25 && (
                <button
                  type="button"
                  onClick={addNuancedProposal}
                  className="mt-3 px-4 py-2 border rounded-lg"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-lighter)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  + Ajouter une proposition
                </button>
              )}
            </div>
          </div>
        )}

        {/* Date de fin - masquée pour ADVICE_SOLICITATION */}
        {formData.decisionType !== 'ADVICE_SOLICITATION' && (
          <div className="border-t pt-6">
            <label htmlFor="endDate" className="block font-medium mb-2">
              Date de fin {formData.decisionType === 'CONSENSUS' ? 'prévisionnelle' : ''} *
            </label>
            <input
              type="datetime-local"
              id="endDate"
              required
              min={minDateString}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {formData.decisionType === 'CONSENT'
                ? 'Durée minimale : 7 jours'
                : 'Doit être au moins 24h dans le futur'}
            </Typography>
          </div>
        )}

        {/* Section Participants (uniquement mode INVITED) */}
        {formData.votingMode === 'INVITED' && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {formData.decisionType === 'ADVICE_SOLICITATION'
                ? `Personnes à solliciter pour avis (minimum ${minimumParticipants})`
                : 'Participants'}
            </h3>

            {formData.decisionType === 'ADVICE_SOLICITATION' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  💡 Conseil : Sélectionnez au moins {minimumParticipants} {minimumParticipants > 1 ? 'personnes compétentes et/ou impactées' : 'personne compétente et/ou impactée'}
                </Typography>
                <Typography variant="body2">
                  {members.length === 1 && 'Votre organisation ne compte qu\'un membre. Vous devez inviter au moins 1 personne externe.'}
                  {members.length >= 2 && members.length <= 4 && 'Votre organisation compte 2 à 4 membres. Sollicitez au moins 1 personne (membre interne ou externe).'}
                  {members.length >= 5 && 'Votre organisation compte 5 membres ou plus. Sollicitez au moins 3 personnes (membres internes ou externes).'}
                </Typography>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Onglets */}
              <Box sx={{ display: 'flex', gap: 1, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setParticipantMode('teams')}
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    border: 0,
                    cursor: 'pointer',
                    backgroundColor: participantMode === 'teams' ? 'primary.light' : 'transparent',
                    color: participantMode === 'teams' ? 'primary.dark' : 'text.primary',
                    '&:hover': { backgroundColor: participantMode === 'teams' ? 'primary.light' : 'action.hover' }
                  }}
                >
                  Équipes et membres
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setParticipantMode('external')}
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    border: 0,
                    cursor: 'pointer',
                    backgroundColor: participantMode === 'external' ? 'primary.light' : 'transparent',
                    color: participantMode === 'external' ? 'primary.dark' : 'text.primary',
                    '&:hover': { backgroundColor: participantMode === 'external' ? 'primary.light' : 'action.hover' }
                  }}
                >
                  Invitations externes
                </Box>
              </Box>

              {/* Onglet Équipes et membres */}
              {participantMode === 'teams' && (
                <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                  {(() => {
                    const filteredMemberIds = new Set(getFilteredMembers().map(m => m.id));
                    const filteredMembersWithoutTeam = getMembersWithoutTeam().filter(m => filteredMemberIds.has(m.id));

                    if (getFilteredTeams().length === 0 && filteredMembersWithoutTeam.length === 0) {
                      return <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ p: 2 }}>Aucun membre disponible</Typography>;
                    }

                    return (
                      <div>
                        {/* Équipes */}
                        {getFilteredTeams().map((team) => {
                          const teamMembers = getTeamMembers(team.id).filter(m => filteredMemberIds.has(m.id));
                        const checkboxState = getTeamCheckboxState(team.id);
                        const isExpanded = expandedTeamIds.includes(team.id);

                        return (
                          <Box key={team.id} sx={{ borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                            {/* Ligne de l'équipe */}
                            <Box sx={{ display: 'flex', alignItems: 'center', py: 1, px: 1.5, '&:hover': { backgroundColor: 'action.hover' } }}>
                              <Box
                                component="button"
                                type="button"
                                onClick={() => toggleTeamExpansion(team.id)}
                                sx={{
                                  mr: 1,
                                  color: 'text.secondary',
                                  border: 0,
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  p: 0,
                                  '&:hover': { color: 'text.primary' }
                                }}
                              >
                                {isExpanded ? (
                                  <ExpandMoreIcon fontSize="small" />
                                ) : (
                                  <ChevronRightIcon fontSize="small" />
                                )}
                              </Box>
                              <Checkbox
                                checked={checkboxState === 'checked'}
                                indeterminate={checkboxState === 'indeterminate'}
                                onChange={() => toggleTeam(team.id)}
                                size="small"
                              />
                              <span className="font-medium text-sm">{team.name}</span>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({teamMembers.length} membres)</Typography>
                            </Box>

                            {/* Membres de l'équipe (si dépliée) */}
                            {isExpanded && (
                              <Box sx={{ backgroundColor: 'background.secondary' }}>
                                {teamMembers.map((member) => (
                                  <Box
                                    key={member.id}
                                    sx={{ display: 'flex', alignItems: 'center', py: 1, px: 1.5, pl: 6, '&:hover': { backgroundColor: 'action.hover' } }}
                                  >
                                    <Checkbox
                                      checked={isUserSelected(member.userId)}
                                      onChange={() => toggleUser(member.userId)}
                                      size="small"
                                    />
                                    <span className="text-sm">{member.user.name || 'Sans nom'}</span>
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({member.user.email})</Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>
                        );
                      })}

                      {/* Section "Sans équipe" */}
                      {(() => {
                        if (filteredMembersWithoutTeam.length === 0) return null;

                        const isExpanded = expandedTeamIds.includes('no-team');
                        const allSelected = filteredMembersWithoutTeam.every(m => isUserSelected(m.userId));
                        const someSelected = filteredMembersWithoutTeam.some(m => isUserSelected(m.userId));
                        const checkboxState = allSelected ? 'checked' : (someSelected ? 'indeterminate' : 'unchecked');

                        return (
                          <Box sx={{ borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                            {/* Ligne "Sans équipe" */}
                            <Box sx={{ display: 'flex', alignItems: 'center', py: 1, px: 1.5, '&:hover': { backgroundColor: 'action.hover' } }}>
                              <Box
                                component="button"
                                type="button"
                                onClick={() => toggleTeamExpansion('no-team')}
                                sx={{
                                  mr: 1,
                                  color: 'text.secondary',
                                  border: 0,
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  p: 0,
                                  '&:hover': { color: 'text.primary' }
                                }}
                              >
                                {isExpanded ? (
                                  <ExpandMoreIcon fontSize="small" />
                                ) : (
                                  <ChevronRightIcon fontSize="small" />
                                )}
                              </Box>
                              <Checkbox
                                checked={checkboxState === 'checked'}
                                indeterminate={checkboxState === 'indeterminate'}
                                onChange={() => {
                                  if (allSelected) {
                                    // Décocher tous
                                    filteredMembersWithoutTeam.forEach(m => {
                                      if (isUserSelected(m.userId)) {
                                        toggleUser(m.userId);
                                      }
                                    });
                                  } else {
                                    // Cocher tous
                                    filteredMembersWithoutTeam.forEach(m => {
                                      if (!isUserSelected(m.userId)) {
                                        toggleUser(m.userId);
                                      }
                                    });
                                  }
                                }}
                                size="small"
                              />
                              <Typography variant="body2" fontWeight="medium" color="text.secondary" fontStyle="italic">Sans équipe</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({filteredMembersWithoutTeam.length} membres)</Typography>
                            </Box>

                            {/* Membres sans équipe (si dépliée) */}
                            {isExpanded && (
                              <Box sx={{ backgroundColor: 'background.secondary' }}>
                                {filteredMembersWithoutTeam.map((member) => (
                                  <Box
                                    key={member.id}
                                    sx={{ display: 'flex', alignItems: 'center', py: 1, px: 1.5, pl: 6, '&:hover': { backgroundColor: 'action.hover' } }}
                                  >
                                    <Checkbox
                                      checked={isUserSelected(member.userId)}
                                      onChange={() => toggleUser(member.userId)}
                                      size="small"
                                    />
                                    <span className="text-sm">{member.user.name || 'Sans nom'}</span>
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({member.user.email})</Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>
                        );
                      })()}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Onglet Invitations externes */}
              {participantMode === 'external' && (
                <div className="space-y-3">
                  <Typography variant="body2" color="text.secondary">
                    Ajoutez des personnes externes par email (elles ne seront pas membres de l'organisation)
                  </Typography>

                  {/* Champs côte à côte (responsive) */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={externalEmail}
                      onChange={(e) => setExternalEmail(e.target.value)}
                      className="flex-1 sm:w-[60%] px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Nom complet"
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      className="flex-1 sm:w-[40%] px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddExternalParticipant}
                    className="px-4 py-2 border rounded-lg text-sm"
                    style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-lighter)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    + Ajouter à la liste
                  </button>

                  {/* Card unique pour tous les participants externes */}
                  {externalParticipants.length > 0 && (
                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: 'background.secondary', p: 1.5 }}>
                      <Typography variant="body2" fontWeight="medium" sx={{ mb: 1.5 }}>Participants externes ajoutés :</Typography>
                      <div className="space-y-2">
                        {externalParticipants.map((participant, index) => (
                          <Box
                            key={index}
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 1.5, backgroundColor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}
                          >
                            <div className="flex-1">
                              <span className="text-sm font-medium">{participant.name}</span>
                              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>({participant.email})</Typography>
                            </div>
                            <Box
                              component="button"
                              type="button"
                              onClick={() => handleRemoveExternalParticipant(participant.email)}
                              sx={{ color: 'error.main', '&:hover': { color: 'error.dark' }, fontSize: '0.875rem', ml: 1, border: 0, background: 'transparent', cursor: 'pointer' }}
                            >
                              Retirer
                            </Box>
                          </Box>
                        ))}
                      </div>
                    </Box>
                  )}
                </div>
              )}

              {/* Résumé des participants sélectionnés */}
              <Box sx={{ p: 1.5, backgroundColor: 'background.secondary', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {formData.decisionType === 'ADVICE_SOLICITATION' ? (
                    <>
                      {getTotalParticipants().internal} membres internes et {getTotalParticipants().external} invités externes sont sollicités pour leur avis
                    </>
                  ) : (
                    <>
                      {getTotalParticipants().internal} membres internes et {getTotalParticipants().external} invités externes participent à la décision
                    </>
                  )}
                </Typography>
                {formData.decisionType === 'ADVICE_SOLICITATION' && getTotalParticipants().total < minimumParticipants && (
                  <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                    ⚠️ Minimum requis : {minimumParticipants} personne(s)
                  </Typography>
                )}
              </Box>
            </div>
          </div>
        )}

        {/* Indicateur de sauvegarde */}
        {!isSaving && lastSavedAt && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 2 }}>
            <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
            <Typography variant="body2" color="success.main">Sauvegardé à {lastSavedAt.toLocaleTimeString()}</Typography>
          </Box>
        )}

        {/* Affichage des erreurs */}
        {error && (
          <div className="px-4 py-3 rounded mb-4" style={{ backgroundColor: 'var(--color-accent-light)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
            {error}
          </div>
        )}

        {/* Boutons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Box
            component="button"
            type="button"
            onClick={() => router.back()}
            sx={{ px: 3, py: 1, border: 1, borderColor: 'divider', borderRadius: 2, cursor: 'pointer', backgroundColor: 'transparent', '&:hover': { backgroundColor: 'action.hover' } }}
          >
            Annuler
          </Box>
          <button
            type="button"
            onClick={handleManualSave}
            disabled={isSaving || !formData.title.trim()}
            className="px-6 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
            onMouseEnter={(e) => !isSaving && formData.title.trim() && (e.currentTarget.style.backgroundColor = 'var(--color-primary-lighter)')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isSaving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
            {isSaving ? 'Sauvegarde...' : 'Enregistrer en brouillon'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
          >
            {loading ? 'Lancement...' : 'Lancer la décision'}
          </button>
        </div>
      </form>
    </div>
  );
}
