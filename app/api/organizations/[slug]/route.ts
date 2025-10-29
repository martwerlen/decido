import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getOrganizationBySlug, checkUserPermission, checkUserIsMember } from '@/lib/organization';

const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  slug: z.string().min(1, 'Le slug est requis').optional(),
  description: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const organization = await getOrganizationBySlug(slug);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est membre de l'organisation
    const isMember = await checkUserIsMember(organization.id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas membre de cette organisation' },
        { status: 403 }
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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const organization = await getOrganizationBySlug(slug);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      );
    }

    const organizationId = organization.id;

    // Vérifier que l'utilisateur est administrateur ou propriétaire
    const hasPermission = await checkUserPermission(organizationId, session.user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Seuls les administrateurs et propriétaires peuvent modifier l\'organisation' },
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

    const { name, slug: newSlug, description } = validationResult.data;

    // Si le slug change, vérifier qu'il n'est pas déjà utilisé
    if (newSlug && newSlug !== organization.slug) {
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: newSlug },
      });

      if (existingOrg) {
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
        ...(name && { name }),
        ...(newSlug && { slug: newSlug }),
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
