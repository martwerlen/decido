'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  FormHelperText,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { generateSlug } from '@/lib/slug';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // États pour la vérification du slug
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);

  // Générer automatiquement le slug à partir du nom
  useEffect(() => {
    if (!slugTouched && name) {
      const generatedSlug = generateSlug(name);
      setSlug(generatedSlug);
    }
  }, [name, slugTouched]);

  // Vérifier la disponibilité du slug avec debounce
  useEffect(() => {
    if (!slug) {
      setSlugAvailable(null);
      setSlugSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const response = await fetch(`/api/organizations/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (response.ok) {
          setSlugAvailable(data.available);
          setSlugSuggestions(data.suggestions || []);
        }
      } catch (err) {
        console.error('Error checking slug:', err);
      } finally {
        setCheckingSlug(false);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [slug]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    setSlug(generateSlug(e.target.value));
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSlugTouched(true);
    setSlug(suggestion);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de l\'organisation');
      }

      // Rediriger vers la page de gestion des membres en utilisant le slug
      router.push(`/organizations/${data.slug}/members`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isSlugValid = slug && slugAvailable === true;
  const canSubmit = name.trim() && slug && !checkingSlug && slugAvailable === true && !loading;

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
            helperText="Le nom de votre organisation"
          />

          <TextField
            fullWidth
            label="Slug (URL)"
            value={slug}
            onChange={handleSlugChange}
            required
            sx={{ mb: 1 }}
            disabled={loading}
            error={slugTouched && slug !== '' && slugAvailable === false}
            InputProps={{
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                  {checkingSlug && <CircularProgress size={20} />}
                  {!checkingSlug && slug && slugAvailable === true && (
                    <CheckCircleIcon color="success" />
                  )}
                  {!checkingSlug && slug && slugAvailable === false && (
                    <ErrorIcon color="error" />
                  )}
                </Box>
              ),
            }}
            helperText={
              !slug
                ? "L'URL de votre organisation (ex: mon-organisation)"
                : checkingSlug
                ? "Vérification..."
                : slugAvailable === true
                ? "✓ Ce slug est disponible"
                : slugAvailable === false
                ? "✗ Ce slug est déjà utilisé"
                : "L'URL de votre organisation"
            }
          />

          {slugSuggestions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <FormHelperText>Suggestions disponibles :</FormHelperText>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {slugSuggestions.map((suggestion) => (
                  <Chip
                    key={suggestion}
                    label={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}

          <TextField
            fullWidth
            label="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={4}
            sx={{ mb: 3 }}
            disabled={loading}
            helperText="Une brève description de votre organisation"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={!canSubmit}
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
