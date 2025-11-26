import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidDecisionType } from '@/types/enums';
import { logDecisionCreated } from '@/lib/decision-logger';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

// GET /api/[slug]/decisions - Liste les décisions d'une organisation avec pagination et filtres
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
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '20', 10);

    // Filtres
    const statusFilter = searchParams.get('status')?.split(',') || [];
    const scopeFilter = searchParams.get('scope') || 'ALL';
    const typeFilter = searchParams.get('type')?.split(',') || [];
    const searchQuery = searchParams.get('search') || '';

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

    // Construire le filtre where
    const where: any = {
      organizationId: organization.id,
    };

    // Filtre par statut (les brouillons sont privés à l'utilisateur)
    if (statusFilter.length > 0) {
      if (!where.AND) where.AND = [];

      // Si on filtre uniquement par DRAFT
      if (statusFilter.length === 1 && statusFilter[0] === 'DRAFT') {
        where.AND.push({
          status: 'DRAFT',
          creatorId: session.user.id, // Seuls SES brouillons
        });
      } else if (statusFilter.includes('DRAFT')) {
        // Si DRAFT est mélangé avec d'autres statuts
        const otherStatuses = statusFilter.filter(s => s !== 'DRAFT');
        where.AND.push({
          OR: [
            { status: 'DRAFT', creatorId: session.user.id }, // Ses brouillons
            { status: { in: otherStatuses } } // Toutes les autres décisions
          ],
        });
      } else {
        // Pas de DRAFT dans le filtre
        where.AND.push({
          status: { in: statusFilter },
        });
      }
    }

    // Filtre par périmètre
    if (scopeFilter !== 'ALL') {
      if (scopeFilter === 'ME') {
        // Décisions créées par l'utilisateur
        where.creatorId = session.user.id;
      } else {
        // Filtre par équipe : décision dédiée à l'équipe OU participants invités via l'équipe
        if (!where.AND) where.AND = [];
        where.AND.push({
          OR: [
            { teamId: scopeFilter },
            {
              participants: {
                some: {
                  teamId: scopeFilter,
                },
              },
            },
          ],
        });
      }
    }

    // Filtre par type
    if (typeFilter.length > 0) {
      where.decisionType = { in: typeFilter };
    }

    // Filtre par recherche textuelle
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { title: { contains: searchLower } },
          { description: { contains: searchLower } },
          { proposal: { contains: searchLower } },
          { initialProposal: { contains: searchLower } },
        ],
      });
    }

    // Filtre PUBLIC_LINK : seul le créateur voit ses décisions PUBLIC_LINK
    if (!where.AND) where.AND = [];
    where.AND.push({
      OR: [
        { votingMode: 'INVITED' },
        { votingMode: 'PUBLIC_LINK', creatorId: session.user.id },
      ],
    });

    // Compter le nombre total de décisions filtrées
    const totalCount = await prisma.decision.count({ where });

    // Récupérer les décisions avec pagination et filtres
    const decisions = await prisma.decision.findMany({
      where,
      select: {
        // Champs scalaires de Decision
        id: true,
        title: true,
        description: true,
        proposal: true,
        initialProposal: true,
        context: true,
        decisionType: true,
        status: true,
        result: true,
        votingMode: true,
        publicSlug: true,
        endDate: true,
        startDate: true,
        decidedAt: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        consentCurrentStage: true,
        // Relations
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          select: {
            userId: true,
            hasVoted: true,
            teamId: true,
          },
        },
        clarificationQuestions: {
          where: {
            questionerId: session.user.id,
          },
          select: {
            id: true,
          },
        },
        opinionResponses: {
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
          },
        },
        consentObjections: {
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            votes: true,
            comments: true,
            proposals: true,
            participants: true,
            anonymousVoteLogs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });

    return Response.json({ decisions, totalCount });
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération des décisions' },
      { status: 500 }
    );
  }
}

// POST /api/[slug]/decisions - Crée une nouvelle décision
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
    const {
      title,
      description,
      decisionType,
      teamId,
      endDate,
      votingMode = 'INVITED',
      launch = false, // Nouveau paramètre : lance immédiatement la décision
      draftId, // ID du brouillon existant si on lance un brouillon
      teamIds = [],
      userIds = [],
      externalParticipants = []
    } = body;

    // Déterminer si c'est un brouillon basé uniquement sur le flag launch
    const isDraft = !launch;

    // Le titre est toujours requis
    if (!title) {
      return Response.json(
        { error: 'Le titre est requis' },
        { status: 400 }
      );
    }

    // Pour les décisions lancées (PUBLIC_LINK ou launch=true), les validations strictes s'appliquent
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

      // Pour ADVICE_SOLICITATION, vérifier la présence de l'intention
      if (decisionType === 'ADVICE_SOLICITATION' && !body.initialProposal) {
        return Response.json(
          { error: 'Une intention de décision est requise pour la sollicitation d\'avis' },
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

      // Vérifier que endDate est au moins 24h dans le futur (sauf ADVICE_SOLICITATION)
      if (decisionType !== 'ADVICE_SOLICITATION') {
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

      // Si mode INVITED et launch=true, vérifier qu'il y a des participants
      if (votingMode === 'INVITED' && launch) {
        const totalParticipants = teamIds.length + userIds.length + externalParticipants.length;
        if (totalParticipants === 0) {
          return Response.json(
            { error: 'Au moins un participant doit être invité' },
            { status: 400 }
          );
        }
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
    if (votingMode === 'PUBLIC_LINK') {
      if (!body.publicSlug || body.publicSlug.length < 3) {
        return Response.json(
          { error: 'Le slug public doit contenir au moins 3 caractères' },
          { status: 400 }
        );
      }

      // Vérifier l'unicité du slug dans l'organisation
      // (en excluant le brouillon actuel si on lance un brouillon existant)
      const whereClause: any = {
        organizationId: organization.id,
        publicSlug: body.publicSlug,
      };

      // Exclure le brouillon actuel si on lance un brouillon existant
      if (draftId) {
        whereClause.id = {
          not: draftId
        };
      }

      const existingSlug = await prisma.decision.findFirst({
        where: whereClause,
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
      // Status basé sur le flag launch
      status: launch ? 'OPEN' : 'DRAFT',
      startDate: launch ? new Date() : null,
      organizationId: organization.id,
      creatorId: session.user.id,
      teamId: teamId || null,
      endDate: endDate ? new Date(endDate) : null,
      initialProposal: body.initialProposal || null,
      // Pour CONSENSUS, copier initialProposal vers proposal
      proposal: (decisionType === 'CONSENSUS' || decisionType === 'ADVICE_SOLICITATION' || decisionType === 'CONSENT') && body.initialProposal
        ? body.initialProposal
        : null,
      votingMode,
      publicSlug: votingMode === 'PUBLIC_LINK' ? body.publicSlug : null,
    };

    // Pour CONSENT, initialiser les champs spécifiques
    if (decisionType === 'CONSENT') {
      decisionData.consentStepMode = body.consentStepMode || 'DISTINCT';
      // Initialiser le stade actuel en fonction du mode
      if (decisionData.consentStepMode === 'MERGED') {
        decisionData.consentCurrentStage = 'CLARIFAVIS';
      } else {
        decisionData.consentCurrentStage = 'CLARIFICATIONS';
      }
    }

    // Ajouter le créateur comme participant uniquement en mode INVITED (brouillon ou lancé)
    // SAUF pour ADVICE_SOLICITATION où le créateur ne participe pas au vote
    if (votingMode === 'INVITED' && decisionType !== 'ADVICE_SOLICITATION') {
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

    // Créer ou mettre à jour la décision
    let decision;

    if (draftId) {
      // Vérifier que le brouillon existe et appartient à l'utilisateur
      const existingDraft = await prisma.decision.findUnique({
        where: { id: draftId },
        select: {
          id: true,
          status: true,
          creatorId: true,
          organizationId: true,
          publicToken: true,
          decisionType: true,
        },
      });

      if (!existingDraft) {
        return Response.json(
          { error: 'Brouillon non trouvé' },
          { status: 404 }
        );
      }

      if (existingDraft.creatorId !== session.user.id) {
        return Response.json(
          { error: 'Vous ne pouvez pas modifier ce brouillon' },
          { status: 403 }
        );
      }

      if (existingDraft.organizationId !== organization.id) {
        return Response.json(
          { error: 'Ce brouillon n\'appartient pas à cette organisation' },
          { status: 400 }
        );
      }

      if (existingDraft.status !== 'DRAFT') {
        return Response.json(
          { error: 'Cette décision a déjà été lancée' },
          { status: 400 }
        );
      }

      // Mettre à jour TOUS les champs du brouillon avant de le lancer
      const updateData: any = {
        title,
        description: description || '',
        decisionType: decisionType || 'MAJORITY',
        teamId: teamId || null,
        endDate: endDate ? new Date(endDate) : null,
        initialProposal: body.initialProposal || null,
        proposal: (decisionType === 'CONSENSUS' || decisionType === 'ADVICE_SOLICITATION' || decisionType === 'CONSENT') && body.initialProposal
          ? body.initialProposal
          : null,
        votingMode,
        publicSlug: votingMode === 'PUBLIC_LINK' ? body.publicSlug : null,
        status: 'OPEN',
        startDate: new Date(),
      };

      // Générer publicToken si PUBLIC_LINK et pas déjà présent
      if (votingMode === 'PUBLIC_LINK' && !existingDraft.publicToken) {
        updateData.publicToken = crypto.randomBytes(32).toString('hex');
      }

      // Pour CONSENT, mettre à jour les champs spécifiques
      if (decisionType === 'CONSENT') {
        updateData.consentStepMode = body.consentStepMode || 'DISTINCT';
        if (body.consentStepMode === 'MERGED') {
          updateData.consentCurrentStage = 'CLARIFAVIS';
        } else {
          updateData.consentCurrentStage = 'CLARIFICATIONS';
        }
      }

      // Pour NUANCED_VOTE, mettre à jour les champs spécifiques
      if (decisionType === 'NUANCED_VOTE') {
        updateData.nuancedScale = body.nuancedScale || '5_LEVELS';
        updateData.nuancedWinnerCount = body.nuancedWinnerCount || 1;
      }

      // Mettre à jour les propositions pour MAJORITY
      if (decisionType === 'MAJORITY' && body.proposals) {
        await prisma.proposal.deleteMany({
          where: { decisionId: draftId },
        });

        if (body.proposals.length > 0) {
          await prisma.proposal.createMany({
            data: body.proposals.map((proposal: any, index: number) => ({
              decisionId: draftId,
              title: proposal.title,
              description: proposal.description || null,
              order: index,
            })),
          });
        }
      }

      // Mettre à jour les propositions pour NUANCED_VOTE
      if (decisionType === 'NUANCED_VOTE' && body.nuancedProposals) {
        await prisma.nuancedProposal.deleteMany({
          where: { decisionId: draftId },
        });

        if (body.nuancedProposals.length > 0) {
          await prisma.nuancedProposal.createMany({
            data: body.nuancedProposals.map((proposal: any, index: number) => ({
              decisionId: draftId,
              title: proposal.title,
              description: proposal.description || null,
              order: index,
            })),
          });
        }
      }

      decision = await prisma.decision.update({
        where: { id: draftId },
        data: updateData,
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

      // Logger le lancement du brouillon
      await prisma.decisionLog.create({
        data: {
          decisionId: decision.id,
          eventType: 'LAUNCHED',
          actorId: session.user.id,
          oldValue: 'DRAFT',
          newValue: 'OPEN',
        },
      });
    } else {
      // Créer une nouvelle décision
      decision = await prisma.decision.create({
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

      // Si launch=true, logger le lancement
      if (launch) {
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
    }

    // Si launch=true et mode INVITED, créer les participants et envoyer les emails
    if (votingMode === 'INVITED' && launch) {
      const createdExternalParticipants: any[] = [];
      const participantsToCreate: any[] = [];

      // Ajouter des équipes entières (optimisé avec une seule requête)
      if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
        // Récupérer toutes les équipes en une seule requête
        const teams = await prisma.team.findMany({
          where: {
            id: { in: teamIds },
            organizationId: organization.id,
          },
          include: {
            members: {
              include: {
                organizationMember: true,
              },
            },
          },
        });

        // Collecter tous les participants à créer
        for (const team of teams) {
          for (const teamMember of team.members) {
            // Ne pas ajouter le créateur de la décision comme participant
            if (teamMember.organizationMember.userId === decision.creatorId) {
              continue;
            }

            participantsToCreate.push({
              decisionId: decision.id,
              userId: teamMember.organizationMember.userId,
              invitedVia: 'TEAM',
              teamId: team.id,
            });
          }
        }
      }

      // Ajouter des membres individuels (vérifier les memberships en une seule requête)
      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        const validUserIds = userIds.filter(userId => userId !== decision.creatorId);

        if (validUserIds.length > 0) {
          // Vérifier tous les memberships en une seule requête
          const memberships = await prisma.organizationMember.findMany({
            where: {
              userId: { in: validUserIds },
              organizationId: organization.id,
            },
            select: {
              userId: true,
            },
          });

          const validUserIdsSet = new Set(memberships.map((m: { userId: string }) => m.userId));

          // Collecter les participants à créer
          for (const userId of validUserIds) {
            if (validUserIdsSet.has(userId)) {
              participantsToCreate.push({
                decisionId: decision.id,
                userId,
                invitedVia: 'MANUAL',
              });
            }
          }
        }
      }

      // Dédupliquer les participants (SQLite ne supporte pas skipDuplicates)
      // Garder seulement le premier participant par userId
      const uniqueParticipants = [];
      const seenUserIds = new Set<string>();

      for (const participant of participantsToCreate) {
        if (!seenUserIds.has(participant.userId)) {
          seenUserIds.add(participant.userId);
          uniqueParticipants.push(participant);
        }
      }

      // Créer tous les participants internes en une seule requête
      if (uniqueParticipants.length > 0) {
        await prisma.decisionParticipant.createMany({
          data: uniqueParticipants,
        });
      }

      // Ajouter des participants externes
      if (externalParticipants && Array.isArray(externalParticipants) && externalParticipants.length > 0) {
        for (const external of externalParticipants) {
          if (!external.email || !external.name) continue;

          try {
            // Générer un token unique pour le participant externe
            const token = crypto.randomBytes(32).toString('hex');

            const participant = await prisma.decisionParticipant.create({
              data: {
                decisionId: decision.id,
                externalEmail: external.email,
                externalName: external.name,
                invitedVia: 'EXTERNAL',
                token,
                tokenExpiresAt: decision.endDate || undefined,
              },
            });
            createdExternalParticipants.push(participant);
          } catch (error) {
            // Ignorer les doublons
            console.error('Duplicate external participant:', error);
          }
        }
      }

      // Envoyer des emails uniquement aux participants externes
      if (createdExternalParticipants.length > 0) {
        console.log(`\n📧 === ENVOI EMAILS === ${createdExternalParticipants.length} participant(s) externe(s)\n`);

        const emailPromises = createdExternalParticipants.map(async (participant) => {
          const email = participant.externalEmail!;
          const name = participant.externalName || 'Participant';
          const voteUrl = `${process.env.NEXTAUTH_URL}/vote/${participant.token}`;

          try {
            console.log(`📤 Envoi à ${email} (${name})`);

            const decisionTypeLabel = decision.decisionType === 'MAJORITY'
              ? 'Vote à la majorité'
              : decision.decisionType === 'CONSENSUS'
              ? 'Consensus'
              : decision.decisionType === 'ADVICE_SOLICITATION'
              ? 'Sollicitation d\'avis'
              : decision.decisionType === 'NUANCED_VOTE'
              ? 'Vote nuancé'
              : decision.decisionType;

            await sendEmail({
              to: email,
              subject: `Nouvelle décision: ${decision.title}`,
              html: `
                <h2>Vous êtes invité à participer à une décision</h2>
                <p>Bonjour ${name},</p>
                <p>Vous êtes invité à participer à une décision :</p>
                <h3>${decision.title}</h3>
                <p>${decision.description}</p>
                <p><strong>Type de décision :</strong> ${decisionTypeLabel}</p>
                ${decision.endDate ? `<p><strong>Date limite :</strong> ${new Date(decision.endDate).toLocaleDateString('fr-FR')}</p>` : ''}
                <p>
                  <a href="${voteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">
                    Participer à la décision
                  </a>
                </p>
                <p>Vous pouvez également cliquer sur ce lien : <a href="${voteUrl}">${voteUrl}</a></p>
                ${decision.endDate ? `<p style="color: #666; font-size: 12px; margin-top: 20px;">Ce lien est personnel et expire le ${new Date(decision.endDate).toLocaleDateString('fr-FR')}.</p>` : ''}
              `,
            });
            console.log(`✅ Envoyé à ${email}`);
          } catch (error) {
            console.error(`❌ Erreur pour ${email}:`, error);
          }
        });

        await Promise.allSettled(emailPromises);
        console.log(`\n📧 === FIN ENVOI EMAILS ===\n`);
      }
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
