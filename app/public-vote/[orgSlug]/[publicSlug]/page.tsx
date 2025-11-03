import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PublicVotePageClient from './PublicVotePageClient';
import { Box, Container, Card, CardContent, Typography } from '@mui/material';

export default async function PublicVotePage({
  params,
}: {
  params: Promise<{ orgSlug: string; publicSlug: string }>;
}) {
  const { orgSlug, publicSlug } = await params;

  // Récupérer l'organisation
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    notFound();
  }

  // Récupérer la décision par publicSlug
  const decision = await prisma.decision.findFirst({
    where: {
      organizationId: org.id,
      publicSlug: publicSlug,
      votingMode: 'PUBLIC_LINK',
    },
    include: {
      proposals: {
        orderBy: { order: 'asc' },
      },
      nuancedProposals: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!decision) {
    notFound();
  }

  // Vérifier que la décision est ouverte
  if (decision.status === 'DRAFT') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 3 }}>
        <Container maxWidth="sm">
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Vote non encore ouvert
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Cette décision n'est pas encore ouverte au vote. Veuillez réessayer plus tard.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  if (decision.status === 'CLOSED') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 3 }}>
        <Container maxWidth="sm">
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Vote terminé
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Cette décision est maintenant fermée et n'accepte plus de votes.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  // Vérifier si la deadline est dépassée
  if (decision.endDate && new Date(decision.endDate) < new Date()) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 3 }}>
        <Container maxWidth="sm">
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Vote expiré
              </Typography>
              <Typography variant="body1" color="text.secondary">
                La date limite pour voter sur cette décision est dépassée.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <PublicVotePageClient
      decision={{
        id: decision.id,
        title: decision.title,
        description: decision.description,
        decisionType: decision.decisionType,
        endDate: decision.endDate ? decision.endDate.toISOString() : null,
        initialProposal: decision.initialProposal,
        proposal: decision.proposal,
        nuancedScale: decision.nuancedScale,
        proposals: decision.proposals,
        nuancedProposals: decision.nuancedProposals,
      }}
      orgSlug={orgSlug}
      publicSlug={publicSlug}
    />
  );
}
