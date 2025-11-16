'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

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
  // Form state for organization info
  const [formData, setFormData] = useState({
    name: '',
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
        name: result.name,
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
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Paramètres de l&apos;organisation
          </Typography>

          <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              helperText="Nom de l'organisation"
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
                    name: organization?.name || '',
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
          </Paper>
        </Box>
      </Box>
  );
}
