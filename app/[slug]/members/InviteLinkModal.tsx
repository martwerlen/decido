'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface InviteLinkModalProps {
  open: boolean;
  onClose: () => void;
  organizationSlug: string;
}

interface InviteLink {
  id: string;
  role: string;
  token: string;
  usageCount: number;
  maxUsage: number;
  createdAt: string;
}

export default function InviteLinkModal({
  open,
  onClose,
  organizationSlug,
}: InviteLinkModalProps) {
  const [activeTab, setActiveTab] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [links, setLinks] = useState<Record<string, InviteLink | null>>({
    MEMBER: null,
    ADMIN: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/${organizationSlug}/invite-links`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du chargement des liens');
      }

      // Organiser les liens par rôle
      const linksByRole: Record<string, InviteLink | null> = {
        MEMBER: null,
        ADMIN: null,
      };

      result.inviteLinks.forEach((link: InviteLink) => {
        linksByRole[link.role] = link;
      });

      setLinks(linksByRole);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationSlug]);

  // Charger les liens existants au montage
  useEffect(() => {
    if (open) {
      fetchLinks();
    }
  }, [open, fetchLinks]);

  const generateLink = async (role: 'MEMBER' | 'ADMIN') => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/${organizationSlug}/invite-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la génération du lien');
      }

      setLinks((prev) => ({
        ...prev,
        [role]: result.inviteLink,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeLink = async (role: 'MEMBER' | 'ADMIN') => {
    if (!confirm(`Êtes-vous sûr de vouloir révoquer le lien ${role} ?`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/${organizationSlug}/invite-links/${role}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la révocation du lien');
      }

      setLinks((prev) => ({
        ...prev,
        [role]: null,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (token: string, role: string) => {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedRole(role);
    setTimeout(() => setCopiedRole(null), 2000);
  };

  const getInviteUrl = (token: string) => {
    return `${window.location.origin}/join/${token}`;
  };

  const currentLink = links[activeTab];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon />
          Inviter via un lien
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Créez un lien d&apos;invitation réutilisable pour ajouter des membres à
            votre organisation. Chaque lien peut être utilisé jusqu&apos;à 10 fois.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Membres" value="MEMBER" />
          <Tab label="Administrateurs" value="ADMIN" />
        </Tabs>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <Box>
            {currentLink ? (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <Chip
                    label={`${currentLink.usageCount}/${currentLink.maxUsage} utilisations`}
                    size="small"
                    color={
                      currentLink.usageCount >= currentLink.maxUsage
                        ? 'error'
                        : 'success'
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    Créé le{' '}
                    {new Date(currentLink.createdAt).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  value={getInviteUrl(currentLink.token)}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            copyToClipboard(currentLink.token, activeTab)
                          }
                          edge="end"
                        >
                          <CopyIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                {copiedRole === activeTab && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Lien copié dans le presse-papier !
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => generateLink(activeTab)}
                    disabled={loading}
                    fullWidth
                  >
                    Régénérer le lien
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => revokeLink(activeTab)}
                    disabled={loading}
                    fullWidth
                  >
                    Révoquer
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Aucun lien actif pour ce rôle. Cliquez sur le bouton ci-dessous
                  pour en créer un.
                </Alert>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => generateLink(activeTab)}
                  disabled={loading}
                >
                  Générer un lien {activeTab === 'MEMBER' ? 'Membre' : 'Admin'}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
