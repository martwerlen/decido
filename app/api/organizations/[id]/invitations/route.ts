import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        { error: 'Vous n\'avez pas les permissions pour supprimer des invitations' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'invitationId est requis' },
        { status: 400 }
      );
    }

    // Supprimer l'invitation
    await prisma.invitation.delete({
      where: {
        id: invitationId,
        organizationId,
      },
    });

    return NextResponse.json({ success: true, message: 'Invitation supprimée' });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'invitation' },
      { status: 500 }
    );
  }
}
