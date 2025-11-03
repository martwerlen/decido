'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DecisionTypeLabels,
  DecisionTypeDescriptions,
  NuancedScaleLabels
} from '@/types/enums';
import { useSidebarRefresh } from '@/components/providers/SidebarRefreshProvider';

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
  const { refreshSidebar } = useSidebarRefresh();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    decisionType: 'MAJORITY' as DecisionType,
    initialProposal: '',
    endDate: '',
    // Mode de vote
    votingMode: 'INVITED' as 'INVITED' | 'PUBLIC_LINK',
    publicSlug: '',
    // Pour le vote nuancé
    nuancedScale: '5_LEVELS' as NuancedScale,
    nuancedWinnerCount: 1,
  });

  const [nuancedProposals, setNuancedProposals] = useState<NuancedProposal[]>([
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  const [majorityProposals, setMajorityProposals] = useState<NuancedProposal[]>([
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Normaliser et valider le slug
  const normalizeSlug = (input: string): string => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  };

  // Vérifier la disponibilité du slug
  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/check-public-slug?slug=${encodeURIComponent(formData.publicSlug)}`
      );
      const data = await response.json();
      setSlugAvailable(data.available);
    } catch (err) {
      console.error('Error checking slug:', err);
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation du mode PUBLIC_LINK
      if (formData.votingMode === 'PUBLIC_LINK') {
        if (!formData.publicSlug || formData.publicSlug.length < 3) {
          setError('Le slug doit contenir au moins 3 caractères');
          setLoading(false);
          return;
        }
        if (slugAvailable === false) {
          setError('Ce slug est déjà utilisé. Veuillez en choisir un autre.');
          setLoading(false);
          return;
        }
      }

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

      // Validation spécifique au vote à la majorité
      if (formData.decisionType === 'MAJORITY') {
        const validProposals = majorityProposals.filter(p => p.title.trim() !== '');
        if (validProposals.length < 2) {
          setError('Vous devez avoir au moins 2 propositions pour le vote à la majorité');
          setLoading(false);
          return;
        }
      }

      // Préparer le body avec les propositions si nécessaire
      const body: any = { ...formData };
      if (formData.decisionType === 'NUANCED_VOTE') {
        body.nuancedProposals = nuancedProposals.filter(p => p.title.trim() !== '');
      } else if (formData.decisionType === 'MAJORITY') {
        body.proposals = majorityProposals.filter(p => p.title.trim() !== '');
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

      // Actualiser la sidebar pour afficher la nouvelle décision
      refreshSidebar();

      // Rediriger selon le mode de vote
      if (formData.votingMode === 'PUBLIC_LINK') {
        console.log('Redirecting to:', `/organizations/${slug}/decisions/${decision.id}/share`);
        router.push(`/organizations/${slug}/decisions/${decision.id}/share`);
      } else {
        console.log('Redirecting to:', `/organizations/${slug}/decisions/${decision.id}/admin`);
        router.push(`/organizations/${slug}/decisions/${decision.id}/admin`);
      }
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

  const addMajorityProposal = () => {
    if (majorityProposals.length < 25) {
      setMajorityProposals([...majorityProposals, { title: '', description: '' }]);
    }
  };

  const removeMajorityProposal = (index: number) => {
    if (majorityProposals.length > 2) {
      setMajorityProposals(majorityProposals.filter((_, i) => i !== index));
    }
  };

  const updateMajorityProposal = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...majorityProposals];
    updated[index][field] = value;
    setMajorityProposals(updated);
  };

  // Calcul de la date minimale (24h dans le futur)
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 24);
  const minDateString = minDate.toISOString().slice(0, 16);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Nouvelle décision</h1>

      {error && (
        <div className="px-4 py-3 rounded mb-4" style={{ backgroundColor: 'var(--color-accent-light)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
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

        {/* Mode de vote */}
        <div className="border-t pt-6">
          <label className="block font-medium mb-3">
            Mode de participation *
          </label>
          <div className="space-y-3">
            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="votingMode"
                value="INVITED"
                checked={formData.votingMode === 'INVITED'}
                onChange={(e) => setFormData({ ...formData, votingMode: 'INVITED', publicSlug: '' })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">Sur invitation</div>
                <div className="text-sm text-gray-600">
                  Vous invitez spécifiquement les participants (internes ou externes). Vous gérez la liste des votants.
                </div>
              </div>
            </label>

            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="votingMode"
                value="PUBLIC_LINK"
                checked={formData.votingMode === 'PUBLIC_LINK'}
                onChange={(e) => setFormData({ ...formData, votingMode: 'PUBLIC_LINK' })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">Vote anonyme via URL</div>
                <div className="text-sm text-gray-600">
                  Créez un lien public que vous pouvez partager. Les votes sont anonymes.
                </div>
              </div>
            </label>
          </div>

          {/* Champ publicSlug si mode PUBLIC_LINK */}
          {formData.votingMode === 'PUBLIC_LINK' && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-primary-lighter)', border: '1px solid var(--color-primary-light)' }}>
              <label htmlFor="publicSlug" className="block font-medium mb-2">
                Slug pour l'URL publique *
              </label>
              <input
                type="text"
                id="publicSlug"
                required
                value={formData.publicSlug}
                onChange={(e) => {
                  const normalized = normalizeSlug(e.target.value);
                  setFormData({ ...formData, publicSlug: normalized });
                  if (normalized.length >= 3) {
                    checkSlugAvailability(normalized);
                  } else {
                    setSlugAvailable(null);
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="mon-vote-2024"
                minLength={3}
                maxLength={50}
              />
              <p className="text-sm text-gray-600 mt-1">
                Le slug doit contenir entre 3 et 50 caractères (lettres, chiffres, tirets uniquement).
              </p>
              {formData.publicSlug && (
                <div className="mt-2">
                  <p className="text-sm font-medium">
                    Aperçu de l'URL : <span className="text-blue-600">/public-vote/{slug}/{formData.publicSlug}</span>
                  </p>
                  {checkingSlug && <p className="text-sm text-gray-500 mt-1">Vérification...</p>}
                  {!checkingSlug && slugAvailable === true && (
                    <p className="text-sm text-green-600 mt-1">✓ Ce slug est disponible</p>
                  )}
                  {!checkingSlug && slugAvailable === false && (
                    <p className="text-sm text-red-600 mt-1">✗ Ce slug est déjà utilisé</p>
                  )}
                </div>
              )}
            </div>
          )}
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

        {/* Propositions (uniquement pour MAJORITY) */}
        {formData.decisionType === 'MAJORITY' && (
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-semibold">Propositions à soumettre au vote</h3>

            <div>
              <label className="block font-medium mb-2">
                Propositions * (minimum 2, maximum 25)
              </label>
              <div className="space-y-4">
                {majorityProposals.map((proposal, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Proposition {index + 1}</h4>
                      {majorityProposals.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeMajorityProposal(index)}
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
                        onChange={(e) => updateMajorityProposal(index, 'title', e.target.value)}
                        placeholder="Titre de la proposition"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={index < 2}
                      />
                      <textarea
                        value={proposal.description}
                        onChange={(e) => updateMajorityProposal(index, 'description', e.target.value)}
                        placeholder="Description (optionnelle)"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {majorityProposals.length < 25 && (
                <button
                  type="button"
                  onClick={addMajorityProposal}
                  className="mt-3 px-4 py-2 border rounded-lg"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-lighter)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  + Ajouter une proposition
                </button>
              )}
            </div>
          </div>
        )}

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
                  className="mt-3 px-4 py-2 border rounded-lg"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-lighter)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
            className="px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
          >
            {loading ? 'Création...' : 'Créer et configurer'}
          </button>
        </div>

        <p className="text-sm text-gray-600">
          {formData.votingMode === 'PUBLIC_LINK'
            ? 'Après la création, vous accéderez à la page de partage avec le lien et le QR code à diffuser.'
            : 'Après la création, vous pourrez configurer les participants avant de lancer la décision.'}
        </p>
      </form>
    </div>
  );
}
