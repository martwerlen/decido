'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import Sidebar from '@/components/dashboard/Sidebar';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationSlug = params.slug as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'menu' | 'members' | 'info'>('menu');

  // Form state for organization info
  const [formData, setFormData] = useState({
    slug: '',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationSlug}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du chargement de l\'organisation');
      }

      setOrganization(result);
      setFormData({
        slug: result.slug,
        description: result.description || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationSlug]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const handleUpdateOrganization = async () => {
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }

      setFormSuccess('Organisation mise à jour avec succès');
      setOrganization(result);

      // Si le slug a changé, rediriger vers la nouvelle URL
      if (result.slug !== organizationSlug) {
        router.push(`/organizations/${result.slug}/settings`);
      }

      setTimeout(() => setFormSuccess(''), 3000);
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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar currentOrgSlug={organizationSlug} />

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Paramètres de {organization?.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, mt: 4 }}>
        {/* Menu latéral */}
        <Paper elevation={3} sx={{ width: 280, height: 'fit-content' }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                selected={activeSection === 'members'}
                onClick={() => router.push(`/organizations/${organizationSlug}/members`)}
              >
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Gérer les membres" />
              </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemButton
                selected={activeSection === 'info'}
                onClick={() => setActiveSection('info')}
              >
                <ListItemIcon>
                  <BusinessIcon />
                </ListItemIcon>
                <ListItemText primary="Informations de l'organisation" />
              </ListItemButton>
            </ListItem>
          </List>
        </Paper>

        {/* Contenu principal */}
        <Paper elevation={3} sx={{ flex: 1, p: 3 }}>
          {activeSection === 'menu' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Bienvenue dans les paramètres
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sélectionnez une option dans le menu pour commencer.
              </Typography>
            </Box>
          )}

          {activeSection === 'info' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Informations de l&apos;organisation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Modifiez les informations de votre organisation.
              </Typography>

              {formError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {formError}
                </Alert>
              )}

              {formSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {formSuccess}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Nom"
                value={organization?.name || ''}
                disabled
                margin="normal"
                helperText="Le nom de l'organisation ne peut pas être modifié"
              />

              <TextField
                fullWidth
                label="Slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                margin="normal"
                helperText="URL de l'organisation (ex: mon-organisation)"
              />

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                margin="normal"
                multiline
                rows={4}
                helperText="Description de l'organisation"
              />

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdateOrganization}
                  disabled={formLoading}
                >
                  {formLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setFormData({
                      slug: organization?.slug || '',
                      description: organization?.description || '',
                    });
                    setFormError('');
                    setFormSuccess('');
                  }}
                  disabled={formLoading}
                >
                  Annuler
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
      </Box>
    </Box>
  );
}
