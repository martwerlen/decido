import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidDecisionType } from '@/types/enums';
import { logDecisionCreated, logDecisionLaunched } from '@/lib/decision-logger';
import { sendEmail } from '@/lib/email';
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

    // Extraction des paramètres
    const {
      title,
      description,
      context,
      decisionType,
      teamId,
      endDate,
      votingMode = 'INVITED',
      launch = false, // Nouveau paramètre : true = lancer directement, false = brouillon
      participants, // Nouveau paramètre : { teamIds, memberIds, externalParticipants }
    } = body;

    // Le titre est toujours requis
    if (!title) {
      return Response.json(
        { error: 'Le titre est requis' },
        { status: 400 }
      );
    }

    // Validation stricte si launch=true ou PUBLIC_LINK
    if (launch || votingMode === 'PUBLIC_LINK') {
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

      // Pour ADVICE_SOLICITATION, vérifier la proposition
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

      // Vérifier endDate (obligatoire sauf pour ADVICE_SOLICITATION)
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

      // Validation des participants pour mode INVITED
      if (votingMode === 'INVITED' && launch) {
        if (!participants || (!participants.teamIds?.length && !participants.memberIds?.length && !participants.externalParticipants?.length)) {
          return Response.json(
            { error: 'Au moins un participant doit être invité' },
            { status: 400 }
          );
        }

        // Validation spécifique pour ADVICE_SOLICITATION
        if (decisionType === 'ADVICE_SOLICITATION') {
          // Compter le nombre total de participants
          const totalParticipants =
            (participants.memberIds?.length || 0) +
            (participants.externalParticipants?.length || 0);

          // Compter les membres de l'organisation (sans le créateur)
          const orgMemberCount = await prisma.organizationMember.count({
            where: {
              organizationId: organization.id,
            },
          });

          // Déterminer le minimum requis
          let minimumRequired = 1;
          if (orgMemberCount === 1) {
            minimumRequired = 1; // 1 membre = 1 externe minimum
            const externalCount = participants.externalParticipants?.length || 0;
            if (externalCount < 1) {
              return Response.json(
                { error: 'Votre organisation ne compte qu\'un membre. Vous devez inviter au moins 1 personne externe.' },
                { status: 400 }
              );
            }
          } else if (orgMemberCount >= 2 && orgMemberCount <= 4) {
            minimumRequired = 1; // 2-4 membres = 1 min (interne ou externe)
          } else if (orgMemberCount >= 5) {
            minimumRequired = 3; // 5+ membres = 3 min (interne ou externe)
          }

          if (totalParticipants < minimumRequired) {
            return Response.json(
              { error: `Vous devez solliciter au moins ${minimumRequired} personne(s) pour cette sollicitation d'avis.` },
              { status: 400 }
            );
          }
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
    if (!launch && endDate) {
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
      context: context || null,
      decisionType: decisionType || 'MAJORITY',
      status: (launch || votingMode === 'PUBLIC_LINK') ? 'OPEN' : 'DRAFT',
      startDate: (launch || votingMode === 'PUBLIC_LINK') ? new Date() : null,
      organizationId: organization.id,
      creatorId: session.user.id,
      teamId: teamId || null,
      endDate: endDate ? new Date(endDate) : null,
      initialProposal: body.initialProposal || null,
      proposal: body.initialProposal || null, // Copier initialProposal dans proposal
      votingMode,
      publicSlug: votingMode === 'PUBLIC_LINK' ? body.publicSlug : null,
    };

    // Générer token public pour PUBLIC_LINK
    if (votingMode === 'PUBLIC_LINK') {
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

    // Créer la décision d'abord
    const decision = await prisma.decision.create({
      data: decisionData,
    });

    // Créer les participants si fournis
    const createdParticipants: any[] = [];
    if (participants && votingMode === 'INVITED') {
      // Ajouter le créateur comme participant
      const creatorParticipant = await prisma.decisionParticipant.create({
        data: {
          decisionId: decision.id,
          userId: session.user.id,
          invitedVia: 'MANUAL',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      createdParticipants.push(creatorParticipant);

      // Ajouter participants via teams
      if (participants.teamIds && participants.teamIds.length > 0) {
        for (const teamId of participants.teamIds) {
          // Récupérer les membres de l'équipe
          const teamMembers = await prisma.teamMember.findMany({
            where: { teamId },
            include: {
              organizationMember: {
                include: {
                  user: true,
                },
              },
            },
          });

          // Créer un participant pour chaque membre (sauf le créateur)
          for (const teamMember of teamMembers) {
            if (teamMember.organizationMember.userId !== session.user.id) {
              const participant = await prisma.decisionParticipant.create({
                data: {
                  decisionId: decision.id,
                  userId: teamMember.organizationMember.userId,
                  invitedVia: 'TEAM',
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              });
              createdParticipants.push(participant);
            }
          }
        }
      }

      // Ajouter participants individuels
      if (participants.memberIds && participants.memberIds.length > 0) {
        for (const userId of participants.memberIds) {
          // Vérifier que ce n'est pas le créateur et qu'il n'est pas déjà ajouté
          if (userId !== session.user.id && !createdParticipants.find(p => p.userId === userId)) {
            const participant = await prisma.decisionParticipant.create({
              data: {
                decisionId: decision.id,
                userId: userId,
                invitedVia: 'MANUAL',
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            });
            createdParticipants.push(participant);
          }
        }
      }

      // Ajouter participants externes
      if (participants.externalParticipants && participants.externalParticipants.length > 0) {
        for (const external of participants.externalParticipants) {
          const token = crypto.randomBytes(32).toString('hex');
          const participant = await prisma.decisionParticipant.create({
            data: {
              decisionId: decision.id,
              userId: null,
              externalEmail: external.email,
              externalName: external.name,
              invitedVia: 'EXTERNAL',
              token,
              tokenExpiresAt: decision.endDate,
            },
          });
          createdParticipants.push(participant);
        }
      }
    }

    // Logger la création
    await logDecisionCreated(decision.id, session.user.id);

    // Si lancement direct, envoyer emails et logger LAUNCHED
    if (launch || votingMode === 'PUBLIC_LINK') {
      await logDecisionLaunched(decision.id, session.user.id);

      // Envoyer emails aux participants externes
      if (votingMode === 'INVITED') {
        const externalParticipants = createdParticipants.filter(p => p.externalEmail);

        if (externalParticipants.length > 0) {
          console.log(`\n📧 === ENVOI EMAILS === ${externalParticipants.length} participant(s) externe(s)\n`);

          const emailPromises = externalParticipants.map(async (participant: any) => {
            const email = participant.externalEmail;
            const name = participant.externalName || 'Participant';
            const voteUrl = `${process.env.NEXTAUTH_URL}/vote/${participant.token}`;

            try {
              console.log(`📤 Envoi à ${email} (${name})`);

              const decisionTypeLabel = decisionType === 'MAJORITY'
                ? 'Vote à la majorité'
                : decisionType === 'CONSENSUS'
                ? 'Consensus'
                : decisionType === 'ADVICE_SOLICITATION'
                ? 'Sollicitation d\'avis'
                : decisionType === 'NUANCED_VOTE'
                ? 'Vote nuancé'
                : decisionType;

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
    }

    // Récupérer la décision complète pour la réponse
    const completeDecision = await prisma.decision.findUnique({
      where: { id: decision.id },
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

    return Response.json({ decision: completeDecision }, { status: 201 });
  } catch (error) {
    console.error('Error creating decision:', error);
    return Response.json(
      { error: 'Erreur lors de la création de la décision' },
      { status: 500 }
    );
  }
}
