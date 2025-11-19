import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/organizations/[slug]/teams/members - Ajouter un membre à une équipe
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
    const { teamId, organizationMemberId } = body;

    if (!teamId || !organizationMemberId) {
      return Response.json(
        { error: 'L\'ID de l\'équipe et l\'ID du membre sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est admin ou owner de l'organisation
    const userOrgMember = await prisma.organizationMember.findFirst({
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

    if (!userOrgMember) {
      return Response.json(
        { error: 'Droits insuffisants pour ajouter un membre à une équipe' },
        { status: 403 }
      );
    }

    // Vérifier que l'équipe appartient à l'organisation
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: userOrgMember.organization.id,
      },
    });

    if (!team) {
      return Response.json(
        { error: 'Équipe non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que le membre appartient à l'organisation
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        id: organizationMemberId,
        organizationId: userOrgMember.organization.id,
      },
    });

    if (!orgMember) {
      return Response.json(
        { error: 'Membre non trouvé dans l\'organisation' },
        { status: 404 }
      );
    }

    // Vérifier que le membre n'est pas déjà dans l'équipe
    const existingTeamMember = await prisma.teamMember.findUnique({
      where: {
        organizationMemberId_teamId: {
          organizationMemberId,
          teamId,
        },
      },
    });

    if (existingTeamMember) {
      return Response.json(
        { error: 'Le membre fait déjà partie de cette équipe' },
        { status: 400 }
      );
    }

    // Ajouter le membre à l'équipe
    const teamMember = await prisma.teamMember.create({
      data: {
        organizationMemberId,
        teamId,
      },
      include: {
        organizationMember: {
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

    return Response.json(teamMember, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du membre à l\'équipe:', error);
    return Response.json(
      { error: 'Erreur lors de l\'ajout du membre à l\'équipe' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[slug]/teams/members - Retirer un membre d'une équipe
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
    const teamMemberId = searchParams.get('teamMemberId');

    if (!teamMemberId) {
      return Response.json(
        { error: 'L\'ID du membre de l\'équipe est requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est admin ou owner de l'organisation
    const userOrgMember = await prisma.organizationMember.findFirst({
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

    if (!userOrgMember) {
      return Response.json(
        { error: 'Droits insuffisants pour retirer un membre d\'une équipe' },
        { status: 403 }
      );
    }

    // Vérifier que le TeamMember existe et appartient à une équipe de l'organisation
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: teamMemberId,
        team: {
          organizationId: userOrgMember.organization.id,
        },
      },
    });

    if (!teamMember) {
      return Response.json(
        { error: 'Membre de l\'équipe non trouvé' },
        { status: 404 }
      );
    }

    // Retirer le membre de l'équipe
    await prisma.teamMember.delete({
      where: {
        id: teamMemberId,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erreur lors du retrait du membre de l\'équipe:', error);
    return Response.json(
      { error: 'Erreur lors du retrait du membre de l\'équipe' },
      { status: 500 }
    );
  }
}
