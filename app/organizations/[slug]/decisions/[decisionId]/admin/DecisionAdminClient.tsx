'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DecisionStatusLabels, DecisionTypeLabels, VotingModeLabels } from '@/types/enums';

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  order: number;
  _count: {
    proposalVotes: number;
  };
}

interface Participant {
  id: string;
  userId: string | null;
  externalEmail: string | null;
  externalName: string | null;
  invitedVia: string;
  hasVoted: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface Team {
  id: string;
  name: string;
  _count: {
    members: number;
  };
}

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Decision {
  id: string;
  title: string;
  description: string;
  decisionType: string;
  status: string;
  votingMode: string;
  publicToken: string | null;
  initialProposal: string | null;
  proposal: string | null;
  conclusion: string | null;
  endDate: Date | null;
  proposals: Proposal[];
  participants: Participant[];
}

interface Props {
  decision: Decision;
  teams: Team[];
  members: Member[];
  slug: string;
  userId: string;
}

export default function DecisionAdminClient({
  decision: initialDecision,
  teams,
  members,
  slug,
  userId,
}: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState(initialDecision);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // État pour les propositions (MAJORITY)
  const [newProposal, setNewProposal] = useState({ title: '', description: '' });

  // État pour la proposition amendée (CONSENSUS)
  const [proposal, setAmendedProposal] = useState(decision.proposal || '');

  // État pour la conclusion
  const [conclusion, setConclusion] = useState(decision.conclusion || '');

  // État pour les participants
  const [participantMode, setParticipantMode] = useState<'teams' | 'users' | 'external'>('teams');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');

  const isDraft = decision.status === 'DRAFT';
  const isOpen = decision.status === 'OPEN';

  // Vérifier si la décision est terminée (pour permettre l'ajout d'une conclusion)
  const now = new Date();
  const isDeadlinePassed = decision.endDate ? new Date(decision.endDate) <= now : false;
  const allParticipantsVoted = decision.participants.every((p) => p.hasVoted);
  const isVotingFinished = isDeadlinePassed || allParticipantsVoted;

  // Ajouter une proposition
  const handleAddProposal = async () => {
    if (!newProposal.title.trim()) {
      setError('Le titre de la proposition est requis');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/proposals`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProposal),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { proposal } = await response.json();
      setDecision({
        ...decision,
        proposals: [...decision.proposals, proposal],
      });
      setNewProposal({ title: '', description: '' });
      setSuccess('Proposition ajoutée avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une proposition
  const handleDeleteProposal = async (proposalId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette proposition ?')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/proposals/${proposalId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setDecision({
        ...decision,
        proposals: decision.proposals.filter((p) => p.id !== proposalId),
      });
      setSuccess('Proposition supprimée');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour la proposition amendée (CONSENSUS)
  const handleUpdateAmendedProposal = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { decision: updated } = await response.json();
      setDecision({ ...decision, proposal: updated.proposal });
      setSuccess('Proposition amendée mise à jour');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour la conclusion
  const handleUpdateConclusion = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/conclusion`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conclusion }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { decision: updated } = await response.json();
      setDecision({ ...decision, conclusion: updated.conclusion });
      setSuccess('Conclusion mise à jour');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Ajouter des participants
  const handleAddParticipants = async () => {
    setLoading(true);
    setError('');

    try {
      let body: any = { type: participantMode };

      if (participantMode === 'teams') {
        if (selectedTeams.length === 0) {
          setError('Sélectionnez au moins une équipe');
          setLoading(false);
          return;
        }
        body.teamIds = selectedTeams;
      } else if (participantMode === 'users') {
        if (selectedUsers.length === 0) {
          setError('Sélectionnez au moins un membre');
          setLoading(false);
          return;
        }
        body.userIds = selectedUsers;
      } else if (participantMode === 'external') {
        if (!externalEmail || !externalName) {
          setError('Email et nom sont requis');
          setLoading(false);
          return;
        }
        body.externalParticipants = [{ email: externalEmail, name: externalName }];
      }

      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { participants } = await response.json();

      setDecision({
        ...decision,
        participants: [...decision.participants, ...participants],
      });

      // Réinitialiser les sélections
      setSelectedTeams([]);
      setSelectedUsers([]);
      setExternalEmail('');
      setExternalName('');

      setSuccess(`${participants.length} participant(s) ajouté(s)`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un participant
  const handleDeleteParticipant = async (participantId: string) => {
    if (!confirm('Voulez-vous vraiment retirer ce participant ?')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/participants?participantId=${participantId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setDecision({
        ...decision,
        participants: decision.participants.filter((p) => p.id !== participantId),
      });
      setSuccess('Participant retiré');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Lancer la décision
  const handleLaunchDecision = async () => {
    if (!confirm('Voulez-vous vraiment lancer cette décision ? Elle ne pourra plus être modifiée.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/organizations/${slug}/decisions/${decision.id}/launch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const { decision: updated } = await response.json();
      setDecision({ ...decision, status: updated.status, publicToken: updated.publicToken });
      setSuccess('Décision lancée ! Les participants ont été notifiés par email.');
      setTimeout(() => {
        router.push(`/organizations/${slug}/decisions/${decision.id}/vote`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{decision.title}</h1>
        <p className="text-gray-600 mt-2">{decision.description}</p>
        <div className="flex gap-2 mt-4">
          <span className="bg-gray-100 px-3 py-1 rounded text-sm">
            {DecisionStatusLabels[decision.status as keyof typeof DecisionStatusLabels]}
          </span>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
            {DecisionTypeLabels[decision.decisionType as keyof typeof DecisionTypeLabels]}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Section Propositions (MAJORITY) */}
      {decision.decisionType === 'MAJORITY' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Propositions</h2>

          {decision.proposals.length > 0 && (
            <div className="space-y-2 mb-4">
              {decision.proposals.map((proposal, index) => (
                <div key={proposal.id} className="flex items-start justify-between p-4 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">
                      {index + 1}. {proposal.title}
                    </div>
                    {proposal.description && (
                      <div className="text-sm text-gray-600 mt-1">{proposal.description}</div>
                    )}
                  </div>
                  {isDraft && (
                    <button
                      onClick={() => handleDeleteProposal(proposal.id)}
                      className="text-red-600 hover:text-red-700 text-sm ml-4"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isDraft && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Titre de la proposition"
                value={newProposal.title}
                onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <textarea
                placeholder="Description (optionnelle)"
                value={newProposal.description}
                onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleAddProposal}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Ajouter une proposition
              </button>
            </div>
          )}

          {decision.proposals.length < 2 && isDraft && (
            <p className="text-sm text-orange-600 mt-2">
              Au moins 2 propositions sont requises pour lancer le vote
            </p>
          )}
        </div>
      )}

      {/* Section Proposition amendée (CONSENSUS) */}
      {decision.decisionType === 'CONSENSUS' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Propositions</h2>

          <div className="mb-4">
            <h3 className="font-medium mb-2">Proposition initiale</h3>
            <div className="p-4 bg-gray-50 rounded border">
              {decision.initialProposal}
            </div>
          </div>

          {(isOpen || decision.proposal) && (
            <div>
              <h3 className="font-medium mb-2">Proposition amendée</h3>
              {isOpen ? (
                <div className="space-y-3">
                  <textarea
                    value={proposal}
                    onChange={(e) => setAmendedProposal(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Vous pouvez amender la proposition pendant que le vote est ouvert..."
                  />
                  <button
                    onClick={handleUpdateAmendedProposal}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mettre à jour la proposition amendée
                  </button>
                </div>
              ) : decision.proposal ? (
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  {decision.proposal}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Aucune proposition amendée</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section Participants */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Participants ({decision.participants.length})
        </h2>

        {decision.participants.length > 0 && (
          <div className="space-y-2 mb-4">
            {decision.participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  {participant.user ? (
                    <div>
                      <span className="font-medium">{participant.user.name || 'Sans nom'}</span>
                      <span className="text-sm text-gray-600 ml-2">({participant.user.email})</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium">{participant.externalName}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({participant.externalEmail}) - Externe
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {participant.hasVoted && (
                    <span className="text-sm text-green-600">✓ A voté</span>
                  )}
                  {isDraft && (
                    <button
                      onClick={() => handleDeleteParticipant(participant.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isDraft && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b pb-2">
              <button
                onClick={() => setParticipantMode('teams')}
                className={`px-4 py-2 rounded ${
                  participantMode === 'teams'
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Équipes
              </button>
              <button
                onClick={() => setParticipantMode('users')}
                className={`px-4 py-2 rounded ${
                  participantMode === 'users'
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Membres
              </button>
              <button
                onClick={() => setParticipantMode('external')}
                className={`px-4 py-2 rounded ${
                  participantMode === 'external'
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Externes
              </button>
            </div>

            {participantMode === 'teams' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Sélectionnez les équipes à inviter (tous les membres seront ajoutés)
                </p>
                {teams.map((team) => (
                  <label key={team.id} className="flex items-center p-3 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(team.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeams([...selectedTeams, team.id]);
                        } else {
                          setSelectedTeams(selectedTeams.filter((id) => id !== team.id));
                        }
                      }}
                      className="mr-3"
                    />
                    <span className="font-medium">{team.name}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({team._count.members} membres)
                    </span>
                  </label>
                ))}
              </div>
            )}

            {participantMode === 'users' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Sélectionnez les membres à inviter individuellement
                </p>
                {members.map((member) => (
                  <label key={member.id} className="flex items-center p-3 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(member.userId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, member.userId]);
                        } else {
                          setSelectedUsers(selectedUsers.filter((id) => id !== member.userId));
                        }
                      }}
                      className="mr-3"
                    />
                    <span className="font-medium">{member.user.name || 'Sans nom'}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({member.user.email})
                    </span>
                  </label>
                ))}
              </div>
            )}

            {participantMode === 'external' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Ajoutez des personnes externes par email (elles ne seront pas membres de l'organisation)
                </p>
                <input
                  type="email"
                  placeholder="Email"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Nom complet"
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            <button
              onClick={handleAddParticipants}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Ajouter les participants
            </button>
          </div>
        )}
      </div>

      {/* Section Conclusion - uniquement si le vote est terminé */}
      {isVotingFinished && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Conclusion</h2>
          <p className="text-sm text-gray-600 mb-4">
            Rédigez une conclusion pour cette décision. Elle apparaîtra à la fin de la page de résultats.
            Vous pouvez utiliser la syntaxe Markdown pour le formatage.
          </p>
          <div className="space-y-3">
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              placeholder="Entrez votre conclusion ici... (Markdown supporté)"
            />
            <button
              onClick={handleUpdateConclusion}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Enregistrer la conclusion
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => router.push(`/organizations/${slug}/decisions`)}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Retour
        </button>

        {isDraft && (
          <button
            onClick={handleLaunchDecision}
            disabled={loading || decision.participants.length === 0 || (decision.decisionType === 'MAJORITY' && decision.proposals.length < 2)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Lancement...' : 'Lancer la décision'}
          </button>
        )}
      </div>

      {isDraft && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-medium text-yellow-800 mb-2">Avant de lancer :</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {decision.decisionType === 'MAJORITY' && decision.proposals.length < 2 && (
              <li>• Ajoutez au moins 2 propositions</li>
            )}
            {decision.participants.length === 0 && (
              <li>• Ajoutez au moins un participant</li>
            )}
            {decision.participants.length > 0 && decision.proposals.length >= 2 && (
              <li className="text-green-700">✓ Tout est prêt pour lancer la décision !</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
