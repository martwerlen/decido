import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Génère un token unique pour les participants externes
function generateExternalVoteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/organizations/[slug]/decisions/[decisionId]/participants - Ajoute des participants
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
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Seul le créateur peut ajouter des participants
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut ajouter des participants' },
        { status: 403 }
      );
    }

    // On ne peut ajouter des participants qu'en mode DRAFT
    if (decision.status !== 'DRAFT') {
      return Response.json(
        { error: 'Les participants ne peuvent être ajoutés qu\'en mode brouillon' },
        { status: 400 }
      );
    }

    const { type, teamIds, userIds, externalParticipants } = body;

    const createdParticipants: any[] = [];

    // Ajouter des équipes entières
    if (type === 'teams' && teamIds && Array.isArray(teamIds)) {
      for (const teamId of teamIds) {
        // Vérifier que l'équipe appartient à l'organisation
        const team = await prisma.team.findFirst({
          where: {
            id: teamId,
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

        if (!team) continue;

        // Ajouter tous les membres de l'équipe
        for (const teamMember of team.members) {
          try {
            const participant = await prisma.decisionParticipant.create({
              data: {
                decisionId,
                userId: teamMember.organizationMember.userId,
                invitedVia: 'TEAM',
                teamId,
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
          } catch (error) {
            // Ignorer les doublons
            console.error('Duplicate participant:', error);
          }
        }
      }
    }

    // Ajouter des membres individuels
    if (type === 'users' && userIds && Array.isArray(userIds)) {
      for (const userId of userIds) {
        // Vérifier que l'utilisateur est membre de l'organisation
        const membership = await prisma.organizationMember.findFirst({
          where: {
            userId,
            organizationId: organization.id,
          },
        });

        if (!membership) continue;

        try {
          const participant = await prisma.decisionParticipant.create({
            data: {
              decisionId,
              userId,
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
        } catch (error) {
          // Ignorer les doublons
          console.error('Duplicate participant:', error);
        }
      }
    }

    // Ajouter des participants externes
    if (type === 'external' && externalParticipants && Array.isArray(externalParticipants)) {
      for (const external of externalParticipants) {
        if (!external.email || !external.name) continue;

        try {
          // Générer un token unique pour le participant externe
          const token = generateExternalVoteToken();

          const participant = await prisma.decisionParticipant.create({
            data: {
              decisionId,
              externalEmail: external.email,
              externalName: external.name,
              invitedVia: 'EXTERNAL',
              token,
              // tokenExpiresAt sera défini lors du lancement de la décision
            },
          });
          createdParticipants.push(participant);
        } catch (error) {
          // Ignorer les doublons
          console.error('Duplicate participant:', error);
        }
      }
    }

    return Response.json({
      participants: createdParticipants,
      count: createdParticipants.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding participants:', error);
    return Response.json(
      { error: 'Erreur lors de l\'ajout des participants' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[slug]/decisions/[decisionId]/participants - Supprime un participant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; decisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug, decisionId } = await params;
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return Response.json(
        { error: 'L\'ID du participant est requis' },
        { status: 400 }
      );
    }

    // Récupérer l'organisation par son slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      return Response.json({ error: "Organisation non trouvée" }, { status: 404 });
    }

    // Récupérer la décision
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        organizationId: organization.id,
      },
    });

    if (!decision) {
      return Response.json({ error: 'Décision non trouvée' }, { status: 404 });
    }

    // Seul le créateur peut supprimer des participants
    if (decision.creatorId !== session.user.id) {
      return Response.json(
        { error: 'Seul le créateur peut supprimer des participants' },
        { status: 403 }
      );
    }

    // On ne peut supprimer des participants qu'en mode DRAFT
    if (decision.status !== 'DRAFT') {
      return Response.json(
        { error: 'Les participants ne peuvent être supprimés qu\'en mode brouillon' },
        { status: 400 }
      );
    }

    await prisma.decisionParticipant.delete({
      where: {
        id: participantId,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error removing participant:', error);
    return Response.json(
      { error: 'Erreur lors de la suppression du participant' },
      { status: 500 }
    );
  }
}
