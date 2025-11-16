'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Chip, Button } from '@mui/material';
import { DecisionTypeLabels } from '@/types/enums';

interface DraftCardProps {
  draft: {
    id: string;
    title: string;
    description: string;
    decisionType: string;
    votingMode: string;
    updatedAt: Date;
  };
  orgSlug: string;
}

export default function DraftCard({ draft, orgSlug }: DraftCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/${orgSlug}/decisions/${draft.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Recharger la page complètement pour mettre à jour la liste
        window.location.reload();
      } else {
        alert('Erreur lors de la suppression du brouillon');
        setIsDeleting(false);
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
      alert('Erreur lors de la suppression du brouillon');
      setIsDeleting(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    } else if (diffInHours > 0) {
      return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInMinutes > 0) {
      return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    } else {
      return 'à l\'instant';
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        border: 2,
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: 1,
        },
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <h3 className="text-sm font-semibold truncate">{draft.title || 'Brouillon sans titre'}</h3>
            <Chip label="Brouillon" size="small" sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }} />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, fontSize: '0.75rem', flexWrap: 'wrap', color: 'text.secondary' }}>
            <Chip
              label={DecisionTypeLabels[draft.decisionType as keyof typeof DecisionTypeLabels]}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
            />
            <Chip
              label={draft.votingMode === 'INVITED' ? 'Sur invitation' : 'Vote anonyme'}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: 'auto', py: 0.25 }}
            />
            <span className="whitespace-nowrap">
              Modifié {getTimeAgo(draft.updatedAt)}
            </span>
          </Box>
        </div>

        <div className="flex gap-2 flex-col sm:flex-row">
          <Button
            component={Link}
            href={`/${orgSlug}/decisions/new?draft=${draft.id}`}
            variant="outlined"
            color="primary"
            size="small"
            sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem', textDecoration: 'none' }}
          >
            Continuer
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="outlined"
            color="error"
            size="small"
            sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </div>
      </div>
    </Box>
  );
}
