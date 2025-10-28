import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/organizations/[slug]/decisions/[decisionId]/proposals - Crée une nouvelle proposition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug, decisionId } = await params;

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: "Organisation non trouvée" }, { status: 404 });
    }
    const body = await request.json();

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
      include: {
        proposals: true,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Seul le créateur peut ajouter des propositions
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut ajouter des propositions' },
        { status: 403 }
      );
    }

    // On ne peut ajouter des propositions qu'en mode DRAFT
    if (decision.status !== 'DRAFT') {
      return Response.json(
        { error: 'Les propositions ne peuvent être ajoutées qu\'en mode brouillon' },
        { status: 400 }
      );
    }

    // Cette fonctionnalité est seulement pour le vote à la majorité
    if (decision.decisionType !== 'MAJORITY') {
      return Response.json(
        { error: 'Les propositions sont uniquement pour le vote à la majorité' },
        { status: 400 }
      );
    }

    // Validation
    const { title, description } = body;

    if (!title) {
      return Response.json(
        { error: 'Le titre de la proposition est requis' },
        { status: 400 }
      );
    }

    // Calculer l'ordre (dernier ordre + 1)
    const maxOrder = decision.proposals.reduce(
      (max, p) => Math.max(max, p.order),
      0
    );

    // Créer la proposition
    const proposal = await prisma.proposal.create({
      data: {
        title,
        description: description || '',
        order: maxOrder + 1,
        decisionId,
      },
    });

    return Response.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return Response.json(
      { error: 'Erreur lors de la création de la proposition' },
      { status: 500 }
    );
  }
}
