'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('[CLIENT] Début de la soumission du formulaire');
    console.log('[CLIENT] Nom:', name, 'Description:', description);

    try {
      console.log('[CLIENT] Envoi de la requête à /api/organizations');
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      console.log('[CLIENT] Réponse reçue, status:', response.status);
      const data = await response.json();
      console.log('[CLIENT] Données reçues:', data);

      if (!response.ok) {
        console.error('[CLIENT] Erreur de réponse:', data.error);
        throw new Error(data.error || 'Erreur lors de la création de l\'organisation');
      }

      console.log('[CLIENT] Redirection vers /organizations/' + data.id + '/members');
      // Rediriger vers la page de gestion des membres
      router.push(`/organizations/${data.id}/members`);
    } catch (err: any) {
      console.error('[CLIENT] Exception attrapée:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Créer une nouvelle organisation
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Une organisation permet de regrouper des membres et de prendre des décisions ensemble.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Nom de l'organisation"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mb: 2 }}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={4}
            sx={{ mb: 3 }}
            disabled={loading}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading || !name.trim()}
            >
              {loading ? 'Création...' : 'Créer l\'organisation'}
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              onClick={() => router.back()}
              disabled={loading}
            >
              Annuler
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
