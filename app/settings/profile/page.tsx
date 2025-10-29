'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  PhotoCamera,
  Person as PersonIcon,
} from '@mui/icons-material';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du chargement du profil');
      }

      setProfile(result);
      setName(result.name || '');
      setImagePreview(result.image);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = async (file: File, maxSizeKB: number = 500): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'));
            return;
          }

          // Définir la taille maximale (800x800 pour garder une bonne qualité)
          const maxWidth = 800;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;

          // Redimensionner si nécessaire
          if (width > height) {
            if (width > maxWidth) {
              height = height * (maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = width * (maxHeight / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height);

          // Compresser progressivement jusqu'à atteindre la taille souhaitée
          let quality = 0.9;
          const tryCompress = () => {
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            const sizeKB = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

            if (sizeKB <= maxSizeKB || quality <= 0.1) {
              resolve(compressedDataUrl);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          };

          tryCompress();
        };
        img.onerror = () => {
          reject(new Error('Erreur lors du chargement de l\'image'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };
    });
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setFormError('Veuillez sélectionner une image valide (PNG, JPG, WebP)');
      return;
    }

    // Vérifier la taille initiale (max 5MB pour éviter les fichiers trop volumineux)
    if (file.size > 5 * 1024 * 1024) {
      setFormError('L\'image doit faire moins de 5MB');
      return;
    }

    // Compresser l'image
    setImageProcessing(true);
    setFormError('');

    try {
      const compressedBase64 = await compressImage(file, 500);
      setImageData(compressedBase64);
      setImagePreview(compressedBase64);
      setFormError('');
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors du traitement de l\'image');
    } finally {
      setImageProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    setImageData('');
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          image: imageData !== null ? imageData : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }

      setFormSuccess('Profil mis à jour avec succès');
      setProfile(result);
      setImageData(null);

      // Mettre à jour la session
      await update();

      setTimeout(() => {
        setFormSuccess('');
      }, 3000);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Modifier mon profil
        </Typography>

        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formError}
            </Alert>
          )}

          {formSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {formSuccess}
            </Alert>
          )}

          {/* Photo de profil */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={imagePreview || undefined}
                sx={{
                  width: 120,
                  height: 120,
                  mb: 2,
                  fontSize: '2.5rem',
                  bgcolor: imagePreview ? 'transparent' : 'primary.main',
                  opacity: imageProcessing ? 0.5 : 1,
                }}
              >
                {!imagePreview && getInitials(name || profile?.name || '')}
              </Avatar>
              {imageProcessing && (
                <CircularProgress
                  size={40}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-20px',
                    marginLeft: '-20px',
                  }}
                />
              )}
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleImageChange}
              style={{ display: 'none' }}
              disabled={imageProcessing}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
                disabled={imageProcessing}
              >
                {imageProcessing ? 'Traitement...' : 'Changer la photo'}
              </Button>

              {imagePreview && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleRemoveImage}
                  disabled={imageProcessing}
                >
                  Supprimer
                </Button>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              PNG, JPG ou WebP. Max 5MB. L&apos;image sera automatiquement optimisée.
            </Typography>
          </Box>

          {/* Informations du profil */}
          <TextField
            fullWidth
            label="Nom complet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Email"
            value={profile?.email || ''}
            margin="normal"
            disabled
            helperText="L'email ne peut pas être modifié"
          />

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={formLoading || !name}
            >
              {formLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.back()}
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
