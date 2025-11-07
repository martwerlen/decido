'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce brouillon ?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/organizations/${orgSlug}/decisions/${draft.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Rafraîchir la page pour mettre à jour la liste
        router.refresh();
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold truncate">{draft.title || 'Brouillon sans titre'}</h3>
            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
              Brouillon
            </span>
          </div>

          <div className="flex gap-2 text-xs flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="px-2 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: 'var(--color-primary-lighter)', color: 'var(--color-primary-dark)' }}>
              {DecisionTypeLabels[draft.decisionType as keyof typeof DecisionTypeLabels]}
            </span>
            <span className="bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
              {draft.votingMode === 'INVITED' ? 'Sur invitation' : 'Vote anonyme'}
            </span>
            <span className="whitespace-nowrap">
              Modifié {getTimeAgo(draft.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 flex-col sm:flex-row">
          <Link
            href={`/organizations/${orgSlug}/decisions/new?draft=${draft.id}`}
            className="px-3 py-1.5 rounded text-xs font-medium text-white whitespace-nowrap text-center"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Continuer
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 rounded text-xs font-medium border border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </Box>
  );
}
