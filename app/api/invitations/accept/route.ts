import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '@/lib/email';

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationResult = acceptInvitationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;

    // Trouver l'invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'invitation est toujours valide
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cette invitation a déjà été utilisée' },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      // Marquer l'invitation comme expirée
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { error: 'Cette invitation a expiré' },
        { status: 400 }
      );
    }

    // Vérifier si un utilisateur existe déjà avec cet email
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      // Vérifier s'il est déjà membre
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMember) {
        // Marquer l'invitation comme acceptée même si déjà membre
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        });

        return NextResponse.json(
          { error: 'Vous êtes déjà membre de cette organisation' },
          { status: 400 }
        );
      }

      // Ajouter l'utilisateur existant à l'organisation
      const member = await prisma.$transaction(async (tx) => {
        const newMember = await tx.organizationMember.create({
          data: {
            userId: existingUser.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        });

        return newMember;
      });

      return NextResponse.json({
        message: 'Vous avez rejoint l\'organisation avec succès',
        member,
        redirectTo: '/dashboard',
      });
    }

    // Créer un nouveau compte utilisateur et l'ajouter à l'organisation
    const hashedPassword = await bcrypt.hash(password, 12);
    const name = `${invitation.firstName} ${invitation.lastName}`;

    const result = await prisma.$transaction(async (tx) => {
      // Créer l'utilisateur
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          name,
          password: hashedPassword,
          emailVerified: new Date(), // Email vérifié automatiquement via l'invitation
        },
      });

      // Ajouter l'utilisateur à l'organisation
      const member = await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // Marquer l'invitation comme acceptée
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      return { user, member };
    });

    // Envoyer l'email de bienvenue
    try {
      await sendWelcomeEmail({
        to: invitation.email,
        name,
        organizationName: invitation.organization.name,
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // On continue même si l'email échoue
    }

    return NextResponse.json(
      {
        message: 'Compte créé avec succès',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        redirectTo: '/auth/signin',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'acceptation de l\'invitation' },
      { status: 500 }
    );
  }
}

// GET pour récupérer les informations d'une invitation
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token requis' },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cette invitation a déjà été utilisée', status: invitation.status },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Cette invitation a expiré', status: 'EXPIRED' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    return NextResponse.json({
      invitation: {
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        email: invitation.email,
        position: invitation.position,
        role: invitation.role,
        organization: invitation.organization,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
      },
      userExists: !!existingUser,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'invitation' },
      { status: 500 }
    );
  }
}
