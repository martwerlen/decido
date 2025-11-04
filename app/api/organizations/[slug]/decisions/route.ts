import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidDecisionType } from '@/types/enums';
import { logDecisionCreated } from '@/lib/decision-logger';
import crypto from 'crypto';

// GET /api/organizations/[slug]/decisions - Liste les décisions d'une organisation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug } = await params;

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est membre de l'organisation
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: organization.id,
        },
      },
    });

    if (!membership) {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les décisions de l'organisation
    const decisions = await prisma.decision.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            votes: true,
            comments: true,
            proposals: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Response.json({ decisions });
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération des décisions' },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[slug]/decisions - Crée une nouvelle décision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est membre de l'organisation
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: organization.id,
        },
      },
    });

    if (!membership) {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Validation
    const { title, description, decisionType, teamId, endDate, votingMode = 'INVITED' } = body;

    // Déterminer si c'est un brouillon (INVITED = brouillon, PUBLIC_LINK = lancé immédiatement)
    const isDraft = votingMode === 'INVITED';

    // Le titre est toujours requis
    if (!title) {
      return Response.json(
        { error: 'Le titre est requis' },
        { status: 400 }
      );
    }

    // Pour les décisions lancées (PUBLIC_LINK), les validations strictes s'appliquent
    if (!isDraft) {
      if (!description) {
        return Response.json(
          { error: 'La description est requise' },
          { status: 400 }
        );
      }

      if (!isValidDecisionType(decisionType)) {
        return Response.json(
          { error: 'Type de décision invalide' },
          { status: 400 }
        );
      }

      // Pour consensus, vérifier la présence de la proposition initiale
      if (decisionType === 'CONSENSUS' && !body.initialProposal) {
        return Response.json(
          { error: 'Une proposition initiale est requise pour le consensus' },
          { status: 400 }
        );
      }

      // Pour vote nuancé, vérifier la configuration
      if (decisionType === 'NUANCED_VOTE') {
        if (!body.nuancedScale || !['3_LEVELS', '5_LEVELS', '7_LEVELS'].includes(body.nuancedScale)) {
          return Response.json(
            { error: 'Échelle de mentions invalide pour le vote nuancé' },
            { status: 400 }
          );
        }
        if (!body.nuancedWinnerCount || body.nuancedWinnerCount < 1) {
          return Response.json(
            { error: 'Le nombre de gagnants doit être au moins 1' },
            { status: 400 }
          );
        }
        if (!body.nuancedProposals || body.nuancedProposals.length < 2) {
          return Response.json(
            { error: 'Au moins 2 propositions sont requises pour le vote nuancé' },
            { status: 400 }
          );
        }
        if (body.nuancedProposals.length > 25) {
          return Response.json(
            { error: 'Maximum 25 propositions pour le vote nuancé' },
            { status: 400 }
          );
        }
        if (body.nuancedWinnerCount > body.nuancedProposals.length) {
          return Response.json(
            { error: 'Le nombre de gagnants ne peut pas dépasser le nombre de propositions' },
            { status: 400 }
          );
        }
      }

      // Pour vote à la majorité, vérifier la présence des propositions
      if (decisionType === 'MAJORITY') {
        if (!body.proposals || body.proposals.length < 2) {
          return Response.json(
            { error: 'Au moins 2 propositions sont requises pour le vote à la majorité' },
            { status: 400 }
          );
        }
        if (body.proposals.length > 25) {
          return Response.json(
            { error: 'Maximum 25 propositions pour le vote à la majorité' },
            { status: 400 }
          );
        }
      }

      // Vérifier que endDate est au moins 24h dans le futur
      if (!endDate) {
        return Response.json(
          { error: 'La date de fin est requise' },
          { status: 400 }
        );
      }
      const endDateObj = new Date(endDate);
      const minDate = new Date();
      minDate.setHours(minDate.getHours() + 24);

      if (endDateObj < minDate) {
        return Response.json(
          { error: 'La date de fin doit être au moins 24h dans le futur' },
          { status: 400 }
        );
      }
    }

    // Validation optionnelle du type de décision pour les brouillons
    if (decisionType && !isValidDecisionType(decisionType)) {
      return Response.json(
        { error: 'Type de décision invalide' },
        { status: 400 }
      );
    }

    // Vérifier que endDate est au moins 24h dans le futur (si fourni pour un brouillon)
    if (isDraft && endDate) {
      const endDateObj = new Date(endDate);
      const minDate = new Date();
      minDate.setHours(minDate.getHours() + 24);

      if (endDateObj < minDate) {
        return Response.json(
          { error: 'La date de fin doit être au moins 24h dans le futur' },
          { status: 400 }
        );
      }
    }

    // Si teamId est fourni, vérifier qu'il appartient à l'organisation
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          organizationId: organization.id,
        },
      });

      if (!team) {
        return Response.json(
          { error: 'Équipe non trouvée ou n\'appartient pas à l\'organisation' },
          { status: 400 }
        );
      }
    }

    // Validation du mode PUBLIC_LINK
    const votingMode = body.votingMode || 'INVITED';
    if (votingMode === 'PUBLIC_LINK') {
      if (!body.publicSlug || body.publicSlug.length < 3) {
        return Response.json(
          { error: 'Le slug public doit contenir au moins 3 caractères' },
          { status: 400 }
        );
      }

      // Vérifier l'unicité du slug dans l'organisation
      const existingSlug = await prisma.decision.findFirst({
        where: {
          organizationId: organization.id,
          publicSlug: body.publicSlug,
        },
      });

      if (existingSlug) {
        return Response.json(
          { error: 'Ce slug est déjà utilisé dans cette organisation' },
          { status: 400 }
        );
      }
    }

    // Préparer les données de la décision
    const decisionData: any = {
      title,
      description: description || '',
      decisionType: decisionType || 'MAJORITY',
      // En mode PUBLIC_LINK, lancer immédiatement (pas besoin de configuration)
      status: votingMode === 'PUBLIC_LINK' ? 'OPEN' : 'DRAFT',
      startDate: votingMode === 'PUBLIC_LINK' ? new Date() : null,
      organizationId: organization.id,
      creatorId: session.user.id,
      teamId: teamId || null,
      endDate: endDate ? new Date(endDate) : null,
      initialProposal: body.initialProposal || null,
      votingMode,
      publicSlug: votingMode === 'PUBLIC_LINK' ? body.publicSlug : null,
    };

    // Ajouter le créateur comme participant uniquement en mode INVITED
    if (votingMode === 'INVITED') {
      decisionData.participants = {
        create: {
          userId: session.user.id,
          invitedVia: 'MANUAL',
        },
      };
    } else if (votingMode === 'PUBLIC_LINK') {
      // Générer un token public unique pour les votes anonymes
      decisionData.publicToken = crypto.randomBytes(32).toString('hex');
    }

    // Pour le vote nuancé, ajouter les champs spécifiques
    if (decisionType === 'NUANCED_VOTE') {
      decisionData.nuancedScale = body.nuancedScale || '5_LEVELS';
      decisionData.nuancedWinnerCount = body.nuancedWinnerCount || 1;

      // Créer les propositions nuancées (uniquement si fournies)
      if (body.nuancedProposals && body.nuancedProposals.length > 0) {
        decisionData.nuancedProposals = {
          create: body.nuancedProposals.map((proposal: any, index: number) => ({
            title: proposal.title,
            description: proposal.description || null,
            order: index,
          })),
        };
      }
    }

    // Pour le vote à la majorité, créer les propositions (uniquement si fournies)
    if (decisionType === 'MAJORITY' && body.proposals && body.proposals.length > 0) {
      decisionData.proposals = {
        create: body.proposals.map((proposal: any, index: number) => ({
          title: proposal.title,
          description: proposal.description || null,
          order: index,
        })),
      };
    }

    // Créer la décision avec le créateur comme participant par défaut
    const decision = await prisma.decision.create({
      data: decisionData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        proposals: decisionType === 'MAJORITY' ? {
          orderBy: {
            order: 'asc',
          },
        } : false,
        nuancedProposals: decisionType === 'NUANCED_VOTE' ? {
          orderBy: {
            order: 'asc',
          },
        } : false,
      },
    });

    // Logger la création de la décision
    await logDecisionCreated(decision.id, session.user.id);

    // Si PUBLIC_LINK, logger aussi le lancement automatique
    if (votingMode === 'PUBLIC_LINK') {
      await prisma.decisionLog.create({
        data: {
          decisionId: decision.id,
          eventType: 'LAUNCHED',
          actorId: session.user.id,
          oldValue: 'DRAFT',
          newValue: 'OPEN',
        },
      });
    }

    return Response.json({ decision }, { status: 201 });
  } catch (error) {
    console.error('Error creating decision:', error);
    return Response.json(
      { error: 'Erreur lors de la création de la décision' },
      { status: 500 }
    );
  }
}
