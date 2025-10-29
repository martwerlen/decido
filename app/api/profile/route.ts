import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/profile - Récupérer le profil de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Mettre à jour le profil
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, image } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
        { status: 400 }
      );
    }

    // Si une image est fournie, valider qu'elle est en base64
    if (image !== undefined && image !== null && image !== '') {
      if (!image.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Format d\'image invalide' },
          { status: 400 }
        );
      }

      // Vérifier la taille approximative (base64 est ~33% plus gros que l'original)
      // Pour 500KB max, la chaîne base64 devrait faire environ 660KB
      if (image.length > 660 * 1024) {
        return NextResponse.json(
          { error: 'L\'image est trop volumineuse (max 500KB)' },
          { status: 400 }
        );
      }
    }

    // Préparer les données à mettre à jour
    const updateData: any = {
      name: name.trim(),
    };

    // Mettre à jour l'image seulement si fournie
    if (image !== undefined) {
      updateData.image = image === '' ? null : image;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
