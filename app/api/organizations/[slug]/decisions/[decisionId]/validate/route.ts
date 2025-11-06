import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/organizations/[slug]/decisions/[decisionId]/validate - Valide la décision finale (ADVICE_SOLICITATION)
export async function PATCH(
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
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const { conclusion } = body;

    // Validation
    if (!conclusion || conclusion.trim() === '') {
      return Response.json(
        { error: 'La décision finale est requise' },
        { status: 400 }
      );
    }

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
      include: {
        participants: true,
        opinionResponses: true,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Vérifier que c'est le créateur
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut valider la décision finale' },
        { status: 403 }
      );
    }

    // Vérifier que c'est bien une décision de type ADVICE_SOLICITATION
    if (decision.decisionType !== 'ADVICE_SOLICITATION') {
      return Response.json(
        { error: 'Cette route est uniquement pour les décisions par sollicitation d\'avis' },
        { status: 400 }
      );
    }

    // Vérifier que la décision est encore OPEN
    if (decision.status !== 'OPEN') {
      return Response.json(
        { error: 'Cette décision n\'est pas ouverte' },
        { status: 400 }
      );
    }

    // Vérifier que tous les avis ont été donnés
    const expectedOpinionCount = decision.participants.length;
    const actualOpinionCount = decision.opinionResponses.length;

    if (actualOpinionCount < expectedOpinionCount) {
      return Response.json(
        {
          error: `Tous les avis n'ont pas encore été donnés (${actualOpinionCount}/${expectedOpinionCount})`,
        },
        { status: 400 }
      );
    }

    // Mettre à jour la décision
    const updatedDecision = await prisma.decision.update({
      where: {
        id: decisionId,
      },
      data: {
        conclusion,
        status: 'CLOSED',
        result: 'APPROVED',
        decidedAt: new Date(),
      },
    });

    // Logger la décision finale
    const userName = session.user.name || session.user.email || 'Créateur';
    await prisma.decisionLog.create({
      data: {
        decisionId,
        eventType: 'FINAL_DECISION_MADE',
        actorId: session.user.id,
        actorName: userName,
        actorEmail: session.user.email || undefined,
      },
    });

    // Logger aussi la fermeture
    await prisma.decisionLog.create({
      data: {
        decisionId,
        eventType: 'CLOSED',
        actorId: session.user.id,
        actorName: userName,
        actorEmail: session.user.email || undefined,
        metadata: JSON.stringify({ reason: 'final_decision' }),
      },
    });

    return Response.json({ decision: updatedDecision });
  } catch (error) {
    console.error('Error validating final decision:', error);
    return Response.json(
      { error: 'Erreur lors de la validation de la décision finale' },
      { status: 500 }
    );
  }
}
