import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendInvitationEmail } from '@/lib/email';
import crypto from 'crypto';

const addMemberSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  position: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  role: z.enum(['MEMBER', 'ADMIN', 'OWNER']).optional().default('MEMBER'),
  sendInvitation: z.boolean().optional().default(true),
});

async function checkUserPermission(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  return member && (member.role === 'OWNER' || member.role === 'ADMIN');
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id: organizationId } = await params;

    // Vérifier que l'utilisateur a les permissions
    const hasPermission = await checkUserPermission(organizationId, session.user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas les permissions pour ajouter des membres' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validationResult = addMemberSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { firstName, lastName, position, email, role, sendInvitation } = validationResult.data;

    // Récupérer les infos de l'organisation
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      );
    }

    // Si un email est fourni et qu'on veut envoyer une invitation
    if (email && email.trim() !== '' && sendInvitation) {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // Vérifier s'il est déjà membre
        const existingMember = await prisma.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId,
            },
          },
        });

        if (existingMember) {
          return NextResponse.json(
            { error: 'Cet utilisateur est déjà membre de l\'organisation' },
            { status: 400 }
          );
        }

        // Ajouter l'utilisateur existant à l'organisation
        const member = await prisma.organizationMember.create({
          data: {
            userId: existingUser.id,
            organizationId,
            role,
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

        return NextResponse.json(member, { status: 201 });
      }

      // Vérifier s'il y a déjà une invitation en attente
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          email,
          organizationId,
          status: 'PENDING',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: 'Une invitation est déjà en attente pour cet email' },
          { status: 400 }
        );
      }

      // Créer une invitation
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

      const invitation = await prisma.invitation.create({
        data: {
          email,
          token,
          firstName,
          lastName,
          position,
          role,
          organizationId,
          invitedById: session.user.id,
          expiresAt,
        },
      });

      // Envoyer l'email d'invitation
      try {
        await sendInvitationEmail({
          to: email,
          firstName,
          lastName,
          organizationName: organization.name,
          invitedByName: session.user.name || 'Un administrateur',
          invitationToken: token,
        });
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // On continue même si l'email échoue, l'invitation est créée
      }

      return NextResponse.json(
        {
          type: 'invitation',
          invitation,
        },
        { status: 201 }
      );
    } else {
      // Ajouter un membre sans email (non-user member)
      const nonUserMember = await prisma.nonUserMember.create({
        data: {
          firstName,
          lastName,
          position,
          organizationId,
        },
      });

      return NextResponse.json(
        {
          type: 'non_user_member',
          member: nonUserMember,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du membre' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id: organizationId } = await params;

    // Vérifier que l'utilisateur a les permissions
    const hasPermission = await checkUserPermission(organizationId, session.user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas les permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'memberId et role sont requis' },
        { status: 400 }
      );
    }

    if (!['MEMBER', 'ADMIN', 'OWNER'].includes(role)) {
      return NextResponse.json(
        { error: 'Rôle invalide' },
        { status: 400 }
      );
    }

    // Mettre à jour le rôle du membre
    const updatedMember = await prisma.organizationMember.update({
      where: {
        id: memberId,
        organizationId,
      },
      data: {
        role,
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

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du rôle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id: organizationId } = await params;

    // Vérifier que l'utilisateur a les permissions
    const hasPermission = await checkUserPermission(organizationId, session.user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas les permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    const nonUserMemberId = searchParams.get('nonUserMemberId');

    if (memberId) {
      // Supprimer un membre avec compte
      await prisma.organizationMember.delete({
        where: {
          id: memberId,
          organizationId,
        },
      });

      return NextResponse.json({ success: true, message: 'Membre supprimé' });
    } else if (nonUserMemberId) {
      // Supprimer un membre sans compte
      await prisma.nonUserMember.delete({
        where: {
          id: nonUserMemberId,
          organizationId,
        },
      });

      return NextResponse.json({ success: true, message: 'Membre supprimé' });
    } else {
      return NextResponse.json(
        { error: 'memberId ou nonUserMemberId est requis' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du membre' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API Members GET] Début de la requête');

    const session = await auth();
    console.log('[API Members GET] Session récupérée:', session?.user?.id);

    if (!session?.user?.id) {
      console.log('[API Members GET] Erreur: Non authentifié');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id: organizationId } = await params;
    console.log('[API Members GET] Organization ID:', organizationId);

    // Vérifier que l'utilisateur est membre de l'organisation
    console.log('[API Members GET] Vérification du membre...');
    const userMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    });
    console.log('[API Members GET] Membre trouvé:', !!userMember);

    if (!userMember) {
      console.log('[API Members GET] Erreur: Non membre');
      return NextResponse.json(
        { error: 'Vous n\'êtes pas membre de cette organisation' },
        { status: 403 }
      );
    }

    // Récupérer tous les membres (utilisateurs avec compte)
    console.log('[API Members GET] Récupération des membres...');
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    // Récupérer les membres sans compte
    console.log('[API Members GET] Récupération des membres sans compte...');
    const nonUserMembers = await prisma.nonUserMember.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    console.log('[API Members GET] Membres sans compte trouvés:', nonUserMembers.length);

    // Récupérer les invitations en attente
    console.log('[API Members GET] Récupération des invitations...');
    const pendingInvitations = await prisma.invitation.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log('[API Members GET] Invitations trouvées:', pendingInvitations.length);

    console.log('[API Members GET] Retour de la réponse');
    return NextResponse.json({
      members,
      nonUserMembers,
      pendingInvitations,
    });
  } catch (error) {
    console.error('[API Members GET] ERREUR:', error);
    console.error('[API Members GET] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des membres' },
      { status: 500 }
    );
  }
}
