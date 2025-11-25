'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{decision.title}</h1>
        <p className="text-gray-600">{decision.description}</p>
        <div className="mt-4">
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              decision.status === 'OPEN'
                ? 'bg-green-100 text-green-800'
                : decision.status === 'DRAFT'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {decision.status === 'OPEN' ? 'En cours' : decision.status === 'DRAFT' ? 'Brouillon' : 'Terminé'}
          </span>
        </div>
      </div>

      {/* Section lien public */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Lien de vote public</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={publicUrl}
            className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {copied ? '✓ Copié' : 'Copier'}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Partagez ce lien pour permettre à tous de voter de manière anonyme.
        </p>
      </div>

      {/* Section QR Code */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">QR Code</h2>
        <div className="flex flex-col items-center">
          <div className="bg-white p-4 border rounded-lg">
            <QRCodeSVG
              id="qr-code"
              value={publicUrl}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
          <button
            onClick={downloadQRCode}
            className="mt-4 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            Télécharger le QR Code
          </button>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Scannez ce code pour accéder directement au vote
          </p>
        </div>
      </div>

      {/* Statistiques en temps réel */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Statistiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{voteCount}</div>
            <div className="text-sm text-gray-600">Votes reçus</div>
          </div>
          {decision.endDate && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg font-semibold text-gray-800">
                {new Date(decision.endDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="text-sm text-gray-600">Date de fin</div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={viewResults}
          className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Voir les résultats
        </button>
        <button
          onClick={closeDecision}
          disabled={closing || decision.status === 'CLOSED'}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {closing ? 'Fermeture...' : 'Fermer la décision'}
        </button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.push(`/${organizationSlug}`)}
          className="text-blue-600 hover:underline"
        >
          ← Retour à l&apos;organisation
        </button>
      </div>
    </Box>
  );
}
