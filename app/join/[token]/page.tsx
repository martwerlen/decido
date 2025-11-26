'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

interface InvitationData {
  organization: {
    id: string;
    name: string;
    slug: string;
    description?: string;
  };
  role: string;
  usageCount: number;
  maxUsage: number;
}

export default function JoinOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  // Charger les détails de l'invitation
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invite-links/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Invitation invalide');
        }

        setInvitation(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const acceptInvitation = useCallback(async () => {
    setAccepting(true);
    setError('');

    try {
      const response = await fetch(`/api/invite-links/${token}/accept`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        // Si l'utilisateur est déjà membre, rediriger vers l'organisation
        if (response.status === 409 && result.organizationSlug) {
          router.push(`/${result.organizationSlug}`);
          return;
        }
        throw new Error(result.error || 'Erreur lors de l\'acceptation');
      }

      // Succès : rediriger vers l'organisation
      router.push(`/${result.organization.slug}`);
    } catch (err: any) {
      setError(err.message);
      setAccepting(false);
    }
  }, [token, router]);

  // Si l'utilisateur est connecté, accepter automatiquement
  useEffect(() => {
    if (status === 'authenticated' && invitation && !accepting && !error) {
      acceptInvitation();
    }
  }, [status, invitation, accepting, error, acceptInvitation]);

  if (loading || status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => router.push('/')}
            fullWidth
          >
            Retour à l&apos;accueil
          </Button>
        </Paper>
      </Box>
    );
  }

  if (accepting) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <CircularProgress sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom>
            Inscription en cours...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vous rejoignez {invitation?.organization.name}
          </Typography>
        </Paper>
      </Box>
    );
  }

  // L'utilisateur n'est pas connecté : afficher les options
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 600,
          width: '100%',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <BusinessIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Invitation à rejoindre
          </Typography>
          <Typography variant="h5" color="primary" gutterBottom>
            {invitation?.organization.name}
          </Typography>
          {invitation?.organization.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {invitation.organization.description}
            </Typography>
          )}
        </Box>

        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.secondary' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Rôle qui vous sera attribué :
            </Typography>
            <Typography variant="h6" color="primary">
              {invitation?.role === 'ADMIN' ? 'Administrateur' : 'Membre'}
            </Typography>
          </CardContent>
        </Card>

        <Alert severity="info" sx={{ mb: 3 }}>
          Pour rejoindre cette organisation, vous devez d&apos;abord créer un compte
          ou vous connecter.
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<PersonAddIcon />}
            onClick={() => router.push(`/auth/signup?inviteToken=${token}`)}
            fullWidth
          >
            Créer un compte
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<LoginIcon />}
            onClick={() => router.push(`/auth/signin?inviteToken=${token}`)}
            fullWidth
          >
            Se connecter
          </Button>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 3 }}
        >
          Ce lien a été utilisé {invitation?.usageCount} fois sur{' '}
          {invitation?.maxUsage} utilisations possibles
        </Typography>
      </Paper>
    </Box>
  );
}
