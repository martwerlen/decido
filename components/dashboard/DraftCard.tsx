'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 hover:shadow-sm transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-800">{draft.title || 'Brouillon sans titre'}</h3>
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium">
              Brouillon
            </span>
          </div>

          {draft.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{draft.description}</p>
          )}

          <div className="flex gap-3 text-xs text-gray-500">
            <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-primary-lighter)', color: 'var(--color-primary-dark)' }}>
              {DecisionTypeLabels[draft.decisionType as keyof typeof DecisionTypeLabels]}
            </span>
            <span className="px-2 py-1 rounded bg-gray-100">
              {draft.votingMode === 'INVITED' ? 'Sur invitation' : 'Vote anonyme'}
            </span>
            <span className="text-gray-500">
              Modifié {getTimeAgo(draft.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <Link
            href={`/organizations/${orgSlug}/decisions/new?draft=${draft.id}`}
            className="px-4 py-2 rounded-lg font-medium text-sm text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Continuer
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg font-medium text-sm border border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}
