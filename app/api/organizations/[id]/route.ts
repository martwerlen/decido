import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateOrganizationSchema = z.object({
  slug: z.string().min(1, 'Le slug est requis').optional(),
  description: z.string().optional(),
});

async function checkUserIsOwner(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  return member && member.role === 'OWNER';
}

export async function GET(
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

    // Vérifier que l'utilisateur est membre de l'organisation
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas membre de cette organisation' },
        { status: 403 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'organisation' },
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

    // Vérifier que l'utilisateur est propriétaire
    const isOwner = await checkUserIsOwner(organizationId, session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut modifier l\'organisation' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validationResult = updateOrganizationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { slug, description } = validationResult.data;

    // Si le slug change, vérifier qu'il n'est pas déjà utilisé
    if (slug) {
      const existingOrg = await prisma.organization.findUnique({
        where: { slug },
      });

      if (existingOrg && existingOrg.id !== organizationId) {
        return NextResponse.json(
          { error: 'Ce slug est déjà utilisé par une autre organisation' },
          { status: 400 }
        );
      }
    }

    // Mettre à jour l'organisation
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(updatedOrganization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'organisation' },
      { status: 500 }
    );
  }
}
