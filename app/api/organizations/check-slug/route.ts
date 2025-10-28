import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSlug, generateAlternativeSlug } from '@/lib/slug';

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Le slug est requis' },
        { status: 400 }
      );
    }

    // Vérifier si le slug existe déjà
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      // Slug déjà pris, suggérer des alternatives
      const baseSlug = slug.replace(/-\d+$/, ''); // Enlever un éventuel suffixe numérique
      const suggestions: string[] = [];

      // Essayer de trouver un slug disponible avec un suffixe
      for (let i = 2; i <= 10; i++) {
        const alternativeSlug = generateAlternativeSlug(baseSlug, i);
        const exists = await prisma.organization.findUnique({
          where: { slug: alternativeSlug },
        });

        if (!exists) {
          suggestions.push(alternativeSlug);
          if (suggestions.length >= 3) break; // Limiter à 3 suggestions
        }
      }

      return NextResponse.json({
        available: false,
        suggestions,
      });
    }

    return NextResponse.json({
      available: true,
      suggestions: [],
    });
  } catch (error) {
    console.error('Error checking slug:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du slug' },
      { status: 500 }
    );
  }
}
