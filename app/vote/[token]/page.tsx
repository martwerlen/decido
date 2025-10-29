import { redirect } from 'next/navigation';
import ExternalVoteClient from './ExternalVoteClient';

export default async function ExternalVotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Pas besoin d'authentification ici - c'est une page publique pour les participants externes
  // La validation du token se fera via l'API

  return <ExternalVoteClient token={token} />;
}
