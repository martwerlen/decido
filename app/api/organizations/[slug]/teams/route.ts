import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organizations/[slug]/teams - Liste toutes les équipes d'une organisation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug } = await params;

    // Vérifier que l'utilisateur est membre de l'organisation
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organization: {
          slug,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!orgMember) {
      return Response.json(
        { error: 'Organisation non trouvée ou accès non autorisé' },
        { status: 404 }
      );
    }

    // Récupérer toutes les équipes de l'organisation avec leurs membres
    const teams = await prisma.team.findMany({
      where: {
        organizationId: orgMember.organization.id,
      },
      include: {
        members: {
          include: {
            organizationMember: {
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

    return Response.json(teams);
  } catch (error) {
    console.error('Erreur lors de la récupération des équipes:', error);
    return Response.json(
      { error: 'Erreur lors de la récupération des équipes' },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[slug]/teams - Créer une nouvelle équipe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim() === '') {
      return Response.json(
        { error: 'Le nom de l\'équipe est requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est admin ou owner de l'organisation
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organization: {
          slug,
        },
        role: {
          in: ['ADMIN', 'OWNER'],
        },
      },
      include: {
        organization: true,
      },
    });

    if (!orgMember) {
      return Response.json(
        { error: 'Droits insuffisants pour créer une équipe' },
        { status: 403 }
      );
    }

    // Créer l'équipe
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId: orgMember.organization.id,
      },
      include: {
        _count: {
          select: {
            members: true,
            decisions: true,
          },
        },
      },
    });

    return Response.json(team, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'équipe:', error);
    return Response.json(
      { error: 'Erreur lors de la création de l\'équipe' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[slug]/teams - Mettre à jour une équipe
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { teamId, name, description } = body;

    if (!teamId) {
      return Response.json(
        { error: 'L\'ID de l\'équipe est requis' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return Response.json(
        { error: 'Le nom de l\'équipe est requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est admin ou owner de l'organisation
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organization: {
          slug,
        },
        role: {
          in: ['ADMIN', 'OWNER'],
        },
      },
      include: {
        organization: true,
      },
    });

    if (!orgMember) {
      return Response.json(
        { error: 'Droits insuffisants pour modifier une équipe' },
        { status: 403 }
      );
    }

    // Vérifier que l'équipe appartient à l'organisation
    const existingTeam = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: orgMember.organization.id,
      },
    });

    if (!existingTeam) {
      return Response.json(
        { error: 'Équipe non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour l'équipe
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
      include: {
        members: {
          include: {
            organizationMember: {
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
    });

    return Response.json(updatedTeam);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'équipe:', error);
    return Response.json(
      { error: 'Erreur lors de la mise à jour de l\'équipe' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[slug]/teams - Supprimer une équipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return Response.json(
        { error: 'L\'ID de l\'équipe est requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est admin ou owner de l'organisation
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organization: {
          slug,
        },
        role: {
          in: ['ADMIN', 'OWNER'],
        },
      },
      include: {
        organization: true,
      },
    });

    if (!orgMember) {
      return Response.json(
        { error: 'Droits insuffisants pour supprimer une équipe' },
        { status: 403 }
      );
    }

    // Vérifier que l'équipe appartient à l'organisation
    const existingTeam = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: orgMember.organization.id,
      },
    });

    if (!existingTeam) {
      return Response.json(
        { error: 'Équipe non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer l'équipe (cascade supprimera les TeamMembers)
    await prisma.team.delete({
      where: {
        id: teamId,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'équipe:', error);
    return Response.json(
      { error: 'Erreur lors de la suppression de l\'équipe' },
      { status: 500 }
    );
  }
}
