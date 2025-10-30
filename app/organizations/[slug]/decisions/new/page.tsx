'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DecisionTypeLabels,
  DecisionTypeDescriptions,
  NuancedScaleLabels
} from '@/types/enums';

type DecisionType = 'MAJORITY' | 'CONSENSUS' | 'NUANCED_VOTE';
type NuancedScale = '3_LEVELS' | '5_LEVELS' | '7_LEVELS';

interface NuancedProposal {
  title: string;
  description: string;
}

export default function NewDecisionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    decisionType: 'MAJORITY' as DecisionType,
    initialProposal: '',
    endDate: '',
    // Pour le vote nuancé
    nuancedScale: '5_LEVELS' as NuancedScale,
    nuancedWinnerCount: 1,
    nuancedSlug: '',
  });

  const [nuancedProposals, setNuancedProposals] = useState<NuancedProposal[]>([
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Vérifier que endDate est au moins 24h dans le futur
      if (formData.endDate) {
        const endDate = new Date(formData.endDate);
        const minDate = new Date();
        minDate.setHours(minDate.getHours() + 24);

        if (endDate < minDate) {
          setError('La date de fin doit être au moins 24h dans le futur');
          setLoading(false);
          return;
        }
      }

      // Validation spécifique au vote nuancé
      if (formData.decisionType === 'NUANCED_VOTE') {
        const validProposals = nuancedProposals.filter(p => p.title.trim() !== '');
        if (validProposals.length < 2) {
          setError('Vous devez avoir au moins 2 propositions pour le vote nuancé');
          setLoading(false);
          return;
        }
        if (formData.nuancedWinnerCount > validProposals.length) {
          setError('Le nombre de gagnants ne peut pas dépasser le nombre de propositions');
          setLoading(false);
          return;
        }
      }

      // Préparer le body avec les propositions nuancées si nécessaire
      const body: any = { ...formData };
      if (formData.decisionType === 'NUANCED_VOTE') {
        body.nuancedProposals = nuancedProposals.filter(p => p.title.trim() !== '');
      }

      const response = await fetch(`/api/organizations/${slug}/decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('API Response:', { ok: response.ok, status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      if (!data.decision || !data.decision.id) {
        console.error('Invalid response:', data);
        throw new Error('Réponse invalide du serveur');
      }

      const { decision } = data;
      console.log('Redirecting to:', `/organizations/${slug}/decisions/${decision.id}/admin`);

      // Rediriger vers la page d'administration pour finaliser la configuration
      router.push(`/organizations/${slug}/decisions/${decision.id}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const addNuancedProposal = () => {
    if (nuancedProposals.length < 25) {
      setNuancedProposals([...nuancedProposals, { title: '', description: '' }]);
    }
  };

  const removeNuancedProposal = (index: number) => {
    if (nuancedProposals.length > 2) {
      setNuancedProposals(nuancedProposals.filter((_, i) => i !== index));
    }
  };

  const updateNuancedProposal = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...nuancedProposals];
    updated[index][field] = value;
    setNuancedProposals(updated);
  };

  // Calcul de la date minimale (24h dans le futur)
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 24);
  const minDateString = minDate.toISOString().slice(0, 16);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Nouvelle décision</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titre */}
        <div>
          <label htmlFor="title" className="block font-medium mb-2">
            Titre de la décision *
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Choix du nouveau logo"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block font-medium mb-2">
            Description *
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Décrivez le contexte et l'objet de la décision..."
          />
        </div>

        {/* Type de décision */}
        <div>
          <label className="block font-medium mb-2">
            Modalité décisionnelle *
          </label>
          <div className="space-y-3">
            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="decisionType"
                value="MAJORITY"
                checked={formData.decisionType === 'MAJORITY'}
                onChange={(e) => setFormData({ ...formData, decisionType: 'MAJORITY' })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">{DecisionTypeLabels.MAJORITY}</div>
                <div className="text-sm text-gray-600">{DecisionTypeDescriptions.MAJORITY}</div>
              </div>
            </label>

            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="decisionType"
                value="CONSENSUS"
                checked={formData.decisionType === 'CONSENSUS'}
                onChange={(e) => setFormData({ ...formData, decisionType: 'CONSENSUS' })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">{DecisionTypeLabels.CONSENSUS}</div>
                <div className="text-sm text-gray-600">{DecisionTypeDescriptions.CONSENSUS}</div>
              </div>
            </label>

            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="decisionType"
                value="NUANCED_VOTE"
                checked={formData.decisionType === 'NUANCED_VOTE'}
                onChange={(e) => setFormData({ ...formData, decisionType: 'NUANCED_VOTE' })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">{DecisionTypeLabels.NUANCED_VOTE}</div>
                <div className="text-sm text-gray-600">{DecisionTypeDescriptions.NUANCED_VOTE}</div>
              </div>
            </label>
          </div>
        </div>

        {/* Proposition initiale (uniquement pour consensus) */}
        {formData.decisionType === 'CONSENSUS' && (
          <div>
            <label htmlFor="initialProposal" className="block font-medium mb-2">
              Proposition initiale *
            </label>
            <textarea
              id="initialProposal"
              required
              rows={4}
              value={formData.initialProposal}
              onChange={(e) => setFormData({ ...formData, initialProposal: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez votre proposition initiale pour le consensus..."
            />
          </div>
        )}

        {/* Configuration du vote nuancé (uniquement pour NUANCED_VOTE) */}
        {formData.decisionType === 'NUANCED_VOTE' && (
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-semibold">Configuration du vote nuancé</h3>

            {/* Échelle de mentions */}
            <div>
              <label htmlFor="nuancedScale" className="block font-medium mb-2">
                Échelle de mentions *
              </label>
              <select
                id="nuancedScale"
                value={formData.nuancedScale}
                onChange={(e) => setFormData({ ...formData, nuancedScale: e.target.value as NuancedScale })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3_LEVELS">{NuancedScaleLabels['3_LEVELS']} (Bon / Passable / Insuffisant)</option>
                <option value="5_LEVELS">{NuancedScaleLabels['5_LEVELS']} (Excellent / Bien / Passable / Insuffisant / À rejeter)</option>
                <option value="7_LEVELS">{NuancedScaleLabels['7_LEVELS']} (Excellent / Très bien / Bien / Assez bien / Passable / Insuffisant / À rejeter)</option>
              </select>
            </div>

            {/* Nombre de gagnants */}
            <div>
              <label htmlFor="nuancedWinnerCount" className="block font-medium mb-2">
                Nombre de propositions gagnantes *
              </label>
              <input
                type="number"
                id="nuancedWinnerCount"
                min="1"
                max="25"
                value={formData.nuancedWinnerCount}
                onChange={(e) => setFormData({ ...formData, nuancedWinnerCount: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-600 mt-1">
                Combien de propositions souhaitez-vous désigner comme gagnantes ?
              </p>
            </div>

            {/* Slug (optionnel, pour lien public) */}
            <div>
              <label htmlFor="nuancedSlug" className="block font-medium mb-2">
                Slug pour URL publique (optionnel)
              </label>
              <input
                type="text"
                id="nuancedSlug"
                value={formData.nuancedSlug}
                onChange={(e) => setFormData({ ...formData, nuancedSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="mon-vote-2024"
              />
              <p className="text-sm text-gray-600 mt-1">
                Si vous souhaitez partager ce vote via un lien public, définissez un slug unique.
                Sinon, laissez vide pour un vote sur invitation uniquement.
              </p>
            </div>

            {/* Propositions */}
            <div>
              <label className="block font-medium mb-2">
                Propositions * (minimum 2, maximum 25)
              </label>
              <div className="space-y-4">
                {nuancedProposals.map((proposal, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Proposition {index + 1}</h4>
                      {nuancedProposals.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeNuancedProposal(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={proposal.title}
                        onChange={(e) => updateNuancedProposal(index, 'title', e.target.value)}
                        placeholder="Titre de la proposition"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={index < 2}
                      />
                      <textarea
                        value={proposal.description}
                        onChange={(e) => updateNuancedProposal(index, 'description', e.target.value)}
                        placeholder="Description (optionnelle)"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {nuancedProposals.length < 25 && (
                <button
                  type="button"
                  onClick={addNuancedProposal}
                  className="mt-3 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                >
                  + Ajouter une proposition
                </button>
              )}
            </div>
          </div>
        )}

        {/* Date de fin */}
        <div>
          <label htmlFor="endDate" className="block font-medium mb-2">
            Date de fin {formData.decisionType === 'CONSENSUS' ? 'prévisionnelle' : ''} *
          </label>
          <input
            type="datetime-local"
            id="endDate"
            required
            min={minDateString}
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-600 mt-1">
            Doit être au moins 24h dans le futur
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création...' : 'Créer et configurer'}
          </button>
        </div>

        <p className="text-sm text-gray-600">
          {formData.decisionType === 'MAJORITY' &&
            'Après la création, vous pourrez ajouter des propositions et configurer les participants avant de lancer la décision.'}
          {formData.decisionType === 'CONSENSUS' &&
            'Après la création, vous pourrez configurer les participants et lancer la décision.'}
          {formData.decisionType === 'NUANCED_VOTE' &&
            'Après la création, vous pourrez configurer les participants (invitations ou lien public) et lancer la décision.'}
        </p>
      </form>
    </div>
  );
}
