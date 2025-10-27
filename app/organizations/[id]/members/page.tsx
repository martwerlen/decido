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
import { Add as AddIcon, Email as EmailIcon, Person as PersonIcon } from '@mui/icons-material';

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
                </TableRow>
              ))}
              {(!data?.members || data.members.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
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
                </TableRow>
              ))}
              {(!data?.nonUserMembers || data.nonUserMembers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

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
