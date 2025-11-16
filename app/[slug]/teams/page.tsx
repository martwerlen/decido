'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemIcon,
  ListItemButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  HowToVote as DecisionIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import UserAvatar from '@/components/common/UserAvatar';

interface TeamMember {
  id: string;
  organizationMember: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
  };
}

interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  members: TeamMember[];
  _count: {
    members: number;
    decisions: number;
  };
}

interface OrganizationMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export default function OrganizationTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationSlug = params.slug as string;

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // États pour la création/édition d'équipe
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    description: '',
  });
  const [teamFormError, setTeamFormError] = useState('');
  const [teamFormLoading, setTeamFormLoading] = useState(false);

  // États pour la suppression d'équipe
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // États pour l'ajout de membres
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [availableMembers, setAvailableMembers] = useState<OrganizationMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');

  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/teams`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du chargement des équipes');
      }

      setTeams(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationSlug]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setTeamFormData({ name: '', description: '' });
    setTeamFormError('');
    setTeamDialogOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name,
      description: team.description || '',
    });
    setTeamFormError('');
    setTeamDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    setTeamFormError('');
    setTeamFormLoading(true);

    try {
      const url = `/api/organizations/${organizationSlug}/teams`;
      const method = editingTeam ? 'PATCH' : 'POST';
      const body = editingTeam
        ? { ...teamFormData, teamId: editingTeam.id }
        : teamFormData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde de l\'équipe');
      }

      setTeamDialogOpen(false);
      setTeamFormData({ name: '', description: '' });
      setEditingTeam(null);
      fetchTeams();
    } catch (err: any) {
      setTeamFormError(err.message);
    } finally {
      setTeamFormLoading(false);
    }
  };

  const handleDeleteClick = (team: Team) => {
    setDeletingTeam(team);
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;

    setDeleteError('');
    setDeleteLoading(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationSlug}/teams?teamId=${deletingTeam.id}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression de l\'équipe');
      }

      setDeleteDialogOpen(false);
      setDeletingTeam(null);
      fetchTeams();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleManageMembers = async (team: Team) => {
    setSelectedTeam(team);
    setMemberError('');
    setSelectedMembers([]);

    try {
      // Récupérer tous les membres de l'organisation
      const response = await fetch(`/api/organizations/${organizationSlug}/members`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du chargement des membres');
      }

      // Filtrer les membres qui ne sont pas déjà dans l'équipe
      const teamMemberIds = team.members.map(m => m.organizationMember.id);
      const available = result.members.filter(
        (member: any) => !teamMemberIds.includes(member.id)
      );

      setAvailableMembers(available);
      setMemberDialogOpen(true);
    } catch (err: any) {
      setMemberError(err.message);
      setMemberDialogOpen(true);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedTeam || selectedMembers.length === 0) return;

    setMemberError('');
    setMemberLoading(true);

    try {
      // Ajouter chaque membre sélectionné
      for (const organizationMemberId of selectedMembers) {
        const response = await fetch(
          `/api/organizations/${organizationSlug}/teams/members`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              teamId: selectedTeam.id,
              organizationMemberId,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors de l\'ajout du membre');
        }
      }

      setMemberDialogOpen(false);
      setSelectedTeam(null);
      setSelectedMembers([]);
      fetchTeams();
    } catch (err: any) {
      setMemberError(err.message);
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (teamId: string, teamMemberId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationSlug}/teams/members?teamMemberId=${teamMemberId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du retrait du membre');
      }

      fetchTeams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Organigramme - Équipes
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PeopleIcon />}
              onClick={() => router.push(`/organizations/${organizationSlug}/members`)}
            >
              Gérer les membres
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateTeam}
            >
              Créer une équipe
            </Button>
          </Box>
        </Box>

        {teams.length === 0 ? (
          <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
            <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Aucune équipe créée
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Créez votre première équipe pour organiser vos membres
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateTeam}
            >
              Créer une équipe
            </Button>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {teams.map((team) => (
              <Box key={team.id}>
                <Card elevation={3}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h2">
                        {team.name}
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTeam(team)}
                          sx={{ mr: 0.5 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(team)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {team.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {team.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Chip
                        icon={<GroupIcon />}
                        label={`${team._count.members} membre${team._count.members > 1 ? 's' : ''}`}
                        size="small"
                      />
                      <Chip
                        icon={<DecisionIcon />}
                        label={`${team._count.decisions} décision${team._count.decisions > 1 ? 's' : ''}`}
                        size="small"
                        color="primary"
                      />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Membres de l&apos;équipe
                    </Typography>

                    {team.members.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Aucun membre
                      </Typography>
                    ) : (
                      <List dense disablePadding>
                        {team.members.slice(0, 3).map((member) => (
                          <ListItem key={member.id} disablePadding>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                              <UserAvatar user={member.organizationMember.user} size="small" />
                              <ListItemText
                                primary={member.organizationMember.user.name}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </Box>
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleRemoveMember(team.id, member.id)}
                              >
                                <PersonRemoveIcon fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                        {team.members.length > 3 && (
                          <ListItem disablePadding>
                            <ListItemText
                              primary={`+${team.members.length - 3} autre${team.members.length - 3 > 1 ? 's' : ''}`}
                              primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                            />
                          </ListItem>
                        )}
                      </List>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={() => handleManageMembers(team)}
                    >
                      Ajouter des membres
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        {/* Dialog pour créer/modifier une équipe */}
        <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTeam ? 'Modifier l&apos;équipe' : 'Créer une équipe'}
          </DialogTitle>
          <DialogContent>
            {teamFormError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {teamFormError}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Nom de l&apos;équipe"
              value={teamFormData.name}
              onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
              required
              margin="normal"
            />

            <TextField
              fullWidth
              label="Description (optionnel)"
              value={teamFormData.description}
              onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
              multiline
              rows={3}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTeamDialogOpen(false)} disabled={teamFormLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveTeam}
              variant="contained"
              color="primary"
              disabled={teamFormLoading || !teamFormData.name.trim()}
            >
              {teamFormLoading ? 'Sauvegarde...' : editingTeam ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de confirmation de suppression */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogContent>
            {deleteError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {deleteError}
              </Alert>
            )}

            {deletingTeam && (
              <Typography variant="body1">
                Êtes-vous sûr de vouloir supprimer l&apos;équipe{' '}
                <strong>{deletingTeam.name}</strong> ?
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Cette action est irréversible et supprimera tous les membres de cette équipe.
                </Typography>
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleDeleteTeam}
              variant="contained"
              color="error"
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog pour ajouter des membres */}
        <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Ajouter des membres à l&apos;équipe</DialogTitle>
          <DialogContent>
            {memberError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {memberError}
              </Alert>
            )}

            {availableMembers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Tous les membres de l&apos;organisation font déjà partie de cette équipe.
              </Typography>
            ) : (
              <List>
                {availableMembers.map((member) => (
                  <ListItem key={member.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleToggleMemberSelection(member.id)}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedMembers.includes(member.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={member.user.name}
                        secondary={member.user.email}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMemberDialogOpen(false)} disabled={memberLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleAddMembers}
              variant="contained"
              color="primary"
              disabled={memberLoading || selectedMembers.length === 0}
            >
              {memberLoading ? 'Ajout...' : `Ajouter ${selectedMembers.length} membre${selectedMembers.length > 1 ? 's' : ''}`}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
}
