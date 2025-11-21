import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/[slug]/decisions/check-public-slug?slug=xxx&excludeDecisionId=yyy
 * Vérifie si un publicSlug est disponible pour une organisation
 * excludeDecisionId: ID de décision à exclure (pour édition de brouillon)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { slug: orgSlug } = await params;
    const { searchParams } = new URL(request.url);
    const publicSlug = searchParams.get('slug');
    const excludeDecisionId = searchParams.get('excludeDecisionId'); // Nouveau paramètre

    if (!publicSlug) {
      return NextResponse.json({ error: 'Slug manquant' }, { status: 400 });
    }

    // Validation du format du slug
    const slugRegex = /^[a-z0-9-]{3,50}$/;
    if (!slugRegex.test(publicSlug)) {
      return NextResponse.json(
        { available: false, error: 'Format de slug invalide' },
        { status: 400 }
      );
    }

    // Vérifier que l'organisation existe et que l'utilisateur en est membre
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 });
    }

    if (org.members.length === 0) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Vérifier si le slug est déjà utilisé dans cette organisation
    // (en excluant la décision en cours d'édition si spécifiée)
    const whereClause: any = {
      organizationId: org.id,
      publicSlug: publicSlug
    };

    // Exclure la décision actuelle si on édite un brouillon
    if (excludeDecisionId) {
      whereClause.id = {
        not: excludeDecisionId
      };
    }

    const existing = await prisma.decision.findFirst({
      where: whereClause
    });

    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error('Error checking public slug:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du slug' },
      { status: 500 }
    );
  }
}
