'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, TextField, Chip, Card, CardContent } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useSidebarRefresh } from '@/components/providers/SidebarRefreshProvider';

interface SharePageClientProps {
  decision: {
    id: string;
    title: string;
    description: string;
    decisionType: string;
    status: string;
    publicSlug: string;
    endDate: string | null;
  };
  organizationSlug: string;
  voteCount: number;
}

export default function SharePageClient({
  decision,
  organizationSlug,
  voteCount: initialVoteCount,
}: SharePageClientProps) {
  const router = useRouter();
  const { refreshSidebar } = useSidebarRefresh();
  const [copied, setCopied] = useState(false);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [closing, setClosing] = useState(false);

  // Construire l&apos;URL publique
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const publicUrl = `${baseUrl}/public-vote/${organizationSlug}/${decision.publicSlug}`;

  // Rafraîchir les statistiques toutes les 10 secondes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/${organizationSlug}/decisions/${decision.id}/stats`
        );
        if (response.ok) {
          const data = await response.json();
          setVoteCount(data.voteCount);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [organizationSlug, decision.id]);

  // Copier le lien
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Télécharger le QR code
  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-code-${decision.publicSlug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Fermer la décision
  const closeDecision = async () => {
    setClosing(true);

    try {
      const response = await fetch(
        `/api/${organizationSlug}/decisions/${decision.id}/close`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        // Actualiser la sidebar pour refléter la fermeture de la décision
        refreshSidebar();
        router.push(`/${organizationSlug}/decisions/${decision.id}/results`);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la fermeture');
        setClosing(false);
      }
    } catch (error) {
      console.error('Error closing decision:', error);
      alert('Erreur lors de la fermeture');
      setClosing(false);
    }
  };

  // Voir les résultats
  const viewResults = () => {
    router.push(`/${organizationSlug}/decisions/${decision.id}/results`);
  };

  return (
    <Box sx={{
      maxWidth: { xs: '100%', sm: '100%', md: 896 },
      mx: 'auto',
      px: { xs: 1.5, sm: 2, md: 3 },
      py: { xs: 3, md: 6 }
    }}>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>{decision.title}</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>{decision.description}</Typography>
        <Box sx={{ mt: 2 }}>
          <Chip
            label={decision.status === 'OPEN' ? 'En cours' : decision.status === 'DRAFT' ? 'Brouillon' : 'Terminé'}
            color={decision.status === 'OPEN' ? 'success' : decision.status === 'DRAFT' ? 'default' : 'info'}
            size="medium"
          />
        </Box>
      </Box>

      {/* Section lien public */}
      <Box sx={{ backgroundColor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Lien de vote public</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            value={publicUrl}
            fullWidth
            InputProps={{
              readOnly: true,
            }}
            size="small"
          />
          <Button
            onClick={copyLink}
            variant="contained"
            color="primary"
            sx={{ minWidth: 100 }}
          >
            {copied ? '✓ Copié' : 'Copier'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Partagez ce lien pour permettre à tous de voter de manière anonyme.
        </Typography>
      </Box>

      {/* Section QR Code */}
      <Box sx={{ backgroundColor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>QR Code</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ backgroundColor: 'background.paper', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <QRCodeSVG
              id="qr-code"
              value={publicUrl}
              size={256}
              level="H"
              includeMargin={true}
            />
          </Box>
          <Button
            onClick={downloadQRCode}
            variant="outlined"
            color="primary"
            sx={{ mt: 2 }}
          >
            Télécharger le QR Code
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Scannez ce code pour accéder directement au vote
          </Typography>
        </Box>
      </Box>

      {/* Statistiques en temps réel */}
      <Box sx={{ backgroundColor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Statistiques</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box sx={{ backgroundColor: 'primary.light', p: 2, borderRadius: 1 }}>
            <Typography variant="h3" fontWeight="bold" color="primary.main">{voteCount}</Typography>
            <Typography variant="body2" color="text.secondary">Votes reçus</Typography>
          </Box>
          {decision.endDate && (
            <Box sx={{ backgroundColor: 'background.secondary', p: 2, borderRadius: 1 }}>
              <Typography variant="body1" fontWeight="semibold">
                {new Date(decision.endDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">Date de fin</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          onClick={viewResults}
          variant="contained"
          color="inherit"
          fullWidth
          sx={{ py: 1.5 }}
        >
          Voir les résultats
        </Button>
        <Button
          onClick={closeDecision}
          disabled={closing || decision.status === 'CLOSED'}
          variant="contained"
          color="error"
          fullWidth
          sx={{ py: 1.5 }}
        >
          {closing ? 'Fermeture...' : 'Fermer la décision'}
        </Button>
      </Box>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          onClick={() => router.push(`/${organizationSlug}`)}
          variant="text"
          color="primary"
        >
          ← Retour à l&apos;organisation
        </Button>
      </Box>
    </Box>
  );
}
