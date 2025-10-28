import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Le nom de l\'organisation est requis'),
  description: z.string().optional(),
  slug: z.string().min(1, 'Le slug est requis'),
});

export async function POST(req: Request) {
  try {
    console.log('[API Organizations POST] Début de la requête');

    const session = await auth();
    console.log('[API Organizations POST] Session:', session?.user?.id);

    if (!session?.user?.id) {
      console.log('[API Organizations POST] Non authentifié');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log('[API Organizations POST] Body:', body);

    const validationResult = createOrganizationSchema.safeParse(body);

    if (!validationResult.success) {
      console.log('[API Organizations POST] Validation échouée:', validationResult.error);
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, description, slug } = validationResult.data;
    console.log('[API Organizations POST] Nom:', name, 'Description:', description, 'Slug:', slug);

    // Vérifier que le slug n'est pas déjà utilisé
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      console.log('[API Organizations POST] Slug déjà utilisé:', slug);
      return NextResponse.json(
        { error: 'Ce slug est déjà utilisé par une autre organisation' },
        { status: 400 }
      );
    }

    console.log('[API Organizations POST] Slug disponible:', slug);

    // Créer l'organisation et ajouter le créateur comme OWNER
    console.log('[API Organizations POST] Création de l\'organisation...');
    const organization = await prisma.organization.create({
      data: {
        name,
        description,
        slug,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
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
      },
    });

    console.log('[API Organizations POST] Organisation créée:', organization.id);
    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error('[API Organizations POST] ERREUR:', error);
    console.error('[API Organizations POST] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'organisation' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer toutes les organisations dont l'utilisateur est membre
    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
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
        _count: {
          select: {
            members: true,
            decisions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des organisations' },
      { status: 500 }
    );
  }
}
