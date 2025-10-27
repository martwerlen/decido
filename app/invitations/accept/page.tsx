'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [userExists, setUserExists] = useState(false);
  const [error, setError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token d\'invitation manquant');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/accept?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invitation invalide');
      }

      setInvitation(data.invitation);
      setUserExists(data.userExists);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAcceptError('');

    if (!userExists) {
      if (!password) {
        setAcceptError('Le mot de passe est requis');
        return;
      }

      if (password.length < 8) {
        setAcceptError('Le mot de passe doit contenir au moins 8 caractères');
        return;
      }

      if (password !== confirmPassword) {
        setAcceptError('Les mots de passe ne correspondent pas');
        return;
      }
    }

    setAcceptLoading(true);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: userExists ? undefined : password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'acceptation de l\'invitation');
      }

      setSuccess(true);

      // Rediriger après 2 secondes
      setTimeout(() => {
        router.push(data.redirectTo);
      }, 2000);
    } catch (err: any) {
      setAcceptError(err.message);
    } finally {
      setAcceptLoading(false);
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
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8, p: 3 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Paper>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8, p: 3 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            {userExists ? 'Vous avez rejoint l\'organisation !' : 'Compte créé avec succès !'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Redirection en cours...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8, p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Invitation à rejoindre
        </Typography>

        <Typography variant="h6" color="primary" gutterBottom>
          {invitation?.organization?.name}
        </Typography>

        <Box sx={{ my: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Vous êtes invité en tant que :
          </Typography>
          <Typography variant="body1">
            <strong>
              {invitation?.firstName} {invitation?.lastName}
            </strong>
          </Typography>
          {invitation?.position && (
            <Typography variant="body2" color="text.secondary">
              {invitation.position}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Email : {invitation?.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rôle : {invitation?.role}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Invité par : {invitation?.invitedBy?.name}
        </Typography>

        {acceptError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {acceptError}
          </Alert>
        )}

        {userExists ? (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Un compte existe déjà avec cet email. En acceptant cette invitation, vous rejoindrez
              l'organisation avec votre compte existant.
            </Alert>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleAccept}
              disabled={acceptLoading}
            >
              {acceptLoading ? 'Acceptation...' : 'Accepter l\'invitation'}
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="body1" gutterBottom>
              Créez votre mot de passe pour rejoindre l'organisation :
            </Typography>

            <TextField
              fullWidth
              type="password"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              margin="normal"
              helperText="Au moins 8 caractères"
              disabled={acceptLoading}
            />

            <TextField
              fullWidth
              type="password"
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              margin="normal"
              disabled={acceptLoading}
            />

            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleAccept}
              disabled={acceptLoading || !password || !confirmPassword}
              sx={{ mt: 3 }}
            >
              {acceptLoading ? 'Création du compte...' : 'Créer mon compte et rejoindre'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
