'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface NonUserMember {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  position?: string;
  role: string;
  status: string;
  createdAt: string;
  invitedBy: {
    name: string;
  };
}

interface MembersData {
  members: Member[];
  nonUserMembers: NonUserMember[];
  pendingInvitations: Invitation[];
}

export default function OrganizationMembersPage() {
  const params = useParams();
  const organizationId = params.id as string;

  const [data, setData] = useState<MembersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    email: '',
    role: 'MEMBER',
    sendInvitation: true,
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // État pour l'édition de rôle
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // État pour la confirmation de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    type: 'member' | 'nonUserMember' | 'invitation';
    id: string;
    name: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du chargement des membres');
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async () => {
    setFormError('');
    setFormLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'ajout du membre');
      }

      // Réinitialiser le formulaire et fermer le dialog
      setFormData({
        firstName: '',
        lastName: '',
        position: '',
        email: '',
        role: 'MEMBER',
        sendInvitation: true,
      });
      setDialogOpen(false);

      // Recharger la liste des membres
      fetchMembers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditRole = (member: Member) => {
    setEditingMember(member);
    setNewRole(member.role);
    setEditError('');
    setEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingMember) return;

    setEditError('');
    setEditLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: editingMember.id,
          role: newRole,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la mise à jour du rôle');
      }

      setEditDialogOpen(false);
      setEditingMember(null);
      fetchMembers();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (
    type: 'member' | 'nonUserMember' | 'invitation',
    id: string,
    name: string
  ) => {
    setDeletingItem({ type, id, name });
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setDeleteError('');
    setDeleteLoading(true);

    try {
      let url = '';
      if (deletingItem.type === 'member') {
        url = `/api/organizations/${organizationId}/members?memberId=${deletingItem.id}`;
      } else if (deletingItem.type === 'nonUserMember') {
        url = `/api/organizations/${organizationId}/members?nonUserMemberId=${deletingItem.id}`;
      } else if (deletingItem.type === 'invitation') {
        url = `/api/organizations/${organizationId}/invitations?invitationId=${deletingItem.id}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      setDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchMembers();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
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
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Gestion des membres
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Ajouter un membre
        </Button>
      </Box>

      {/* Membres avec compte utilisateur */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon /> Membres avec compte ({data?.members.length || 0})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Membre depuis</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.user.name}</TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={member.role}
                      color={
                        member.role === 'OWNER'
                          ? 'error'
                          : member.role === 'ADMIN'
                          ? 'warning'
                          : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(member.joinedAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditRole(member)}
                      sx={{ mr: 1 }}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() =>
                        handleDeleteClick('member', member.id, member.user.name)
                      }
                    >
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.members || data.members.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Aucun membre avec compte
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Membres sans compte utilisateur */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon /> Membres sans compte ({data?.nonUserMembers.length || 0})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Prénom</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Fonction</TableCell>
                <TableCell>Ajouté le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.nonUserMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.firstName}</TableCell>
                  <TableCell>{member.lastName}</TableCell>
                  <TableCell>{member.position || '-'}</TableCell>
                  <TableCell>
                    {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() =>
                        handleDeleteClick(
                          'nonUserMember',
                          member.id,
                          `${member.firstName} ${member.lastName}`
                        )
                      }
                    >
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.nonUserMembers || data.nonUserMembers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Aucun membre sans compte
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Invitations en attente */}
      {data?.pendingInvitations && data.pendingInvitations.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Invitations en attente ({data.pendingInvitations.length})
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Fonction</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell>Invité par</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      {invitation.firstName} {invitation.lastName}
                    </TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>{invitation.position || '-'}</TableCell>
                    <TableCell>
                      <Chip label={invitation.role} size="small" />
                    </TableCell>
                    <TableCell>{invitation.invitedBy.name}</TableCell>
                    <TableCell>
                      {new Date(invitation.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() =>
                          handleDeleteClick(
                            'invitation',
                            invitation.id,
                            `${invitation.firstName} ${invitation.lastName}`
                          )
                        }
                      >
                        Annuler
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialog pour éditer le rôle d'un membre */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Modifier le rôle</DialogTitle>
        <DialogContent>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}

          {editingMember && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Modifier le rôle de {editingMember.user.name}
              </Typography>

              <FormControl fullWidth>
                <InputLabel>Rôle</InputLabel>
                <Select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  label="Rôle"
                >
                  <MenuItem value="MEMBER">Membre</MenuItem>
                  <MenuItem value="ADMIN">Administrateur</MenuItem>
                  <MenuItem value="OWNER">Propriétaire</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={editLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            color="primary"
            disabled={editLoading || newRole === editingMember?.role}
          >
            {editLoading ? 'Mise à jour...' : 'Mettre à jour'}
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

          {deletingItem && (
            <Typography variant="body1">
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong>{deletingItem.name}</strong> ?
              {deletingItem.type === 'member' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Cette action est irréversible.
                </Typography>
              )}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour ajouter un membre */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un membre</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Prénom"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            margin="normal"
          />

          <TextField
            fullWidth
            label="Nom"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            margin="normal"
          />

          <TextField
            fullWidth
            label="Fonction (optionnel)"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Email (optionnel)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
            helperText="Si fourni, la personne recevra une invitation par email"
          />

          {formData.email && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>Rôle</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="Rôle"
                >
                  <MenuItem value="MEMBER">Membre</MenuItem>
                  <MenuItem value="ADMIN">Administrateur</MenuItem>
                  <MenuItem value="OWNER">Propriétaire</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.sendInvitation}
                    onChange={(e) =>
                      setFormData({ ...formData, sendInvitation: e.target.checked })
                    }
                  />
                }
                label="Envoyer une invitation par email"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={formLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleAddMember}
            variant="contained"
            color="primary"
            disabled={formLoading || !formData.firstName || !formData.lastName}
          >
            {formLoading ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
