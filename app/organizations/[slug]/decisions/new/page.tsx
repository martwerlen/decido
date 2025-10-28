'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DecisionTypeLabels, DecisionTypeDescriptions } from '@/types/enums';

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
    decisionType: 'MAJORITY' as 'MAJORITY' | 'CONSENSUS',
    initialProposal: '',
    endDate: '',
  });

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

      const response = await fetch(`/api/organizations/${slug}/decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      const { decision } = await response.json();

      // Rediriger vers la page d'administration pour finaliser la configuration
      router.push(`/organizations/${slug}/decisions/${decision.id}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
    }
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
          Après la création, vous pourrez ajouter des propositions (pour le vote à la majorité)
          ou configurer les participants et lancer la décision.
        </p>
      </form>
    </div>
  );
}
