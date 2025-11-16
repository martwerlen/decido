/**
 * Liste des slugs réservés qui ne peuvent pas être utilisés pour les organisations
 * Ces slugs correspondent à des routes système de l'application
 */
export const RESERVED_SLUGS = [
  // Routes système (top-level)
  'api',
  'auth',
  'vote',
  'public-vote',
  'invitations',
  'settings',
  'create-organization',
  '_next',

  // Sous-routes qui causeraient des conflits avec /[slug]/xxx
  'decisions',
  'members',
  'teams',
  'new',

  // Termes génériques à éviter (confusion/usage futur)
  'organizations',
  'admin',
  'dashboard',

  // Assets statiques
  'favicon.ico',
  'logo.svg',
] as const;

/**
 * Type pour un slug valide (non réservé)
 */
export type ValidSlug = string;

/**
 * Résultat de la validation d'un slug
 */
export type SlugValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Vérifie si un slug est réservé
 * @param slug - Le slug à vérifier
 * @returns true si le slug est réservé, false sinon
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug as any);
}

/**
 * Valide un slug pour une organisation
 * @param slug - Le slug à valider
 * @returns Résultat de la validation avec un message d'erreur si invalide
 */
export function validateOrganizationSlug(slug: string): SlugValidationResult {
  // Vérifier que le slug n'est pas vide
  if (!slug || slug.trim().length === 0) {
    return {
      valid: false,
      error: 'Le slug ne peut pas être vide',
    };
  }

  // Vérifier que le slug n'est pas réservé (avant les autres validations pour un message plus spécifique)
  if (isReservedSlug(slug)) {
    return {
      valid: false,
      error: `Le slug "${slug}" est réservé et ne peut pas être utilisé`,
    };
  }

  // Vérifier la longueur (minimum 3 caractères)
  if (slug.length < 3) {
    return {
      valid: false,
      error: 'Le slug doit contenir au moins 3 caractères',
    };
  }

  // Vérifier la longueur (maximum 50 caractères)
  if (slug.length > 50) {
    return {
      valid: false,
      error: 'Le slug ne peut pas dépasser 50 caractères',
    };
  }

  // Vérifier le format (lettres minuscules, chiffres, tirets uniquement)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return {
      valid: false,
      error: 'Le slug ne peut contenir que des lettres minuscules, des chiffres et des tirets (pas de tirets consécutifs ou en début/fin)',
    };
  }

  return { valid: true };
}

/**
 * Génère un slug à partir d'un texte
 * @param text - Le texte à convertir en slug
 * @returns Le slug généré
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remplacer les caractères accentués
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplacer les espaces et caractères spéciaux par des tirets
    .replace(/[^a-z0-9]+/g, '-')
    // Supprimer les tirets en début et fin
    .replace(/^-+|-+$/g, '')
    // Limiter à 50 caractères
    .slice(0, 50)
    // Supprimer le tiret final si la coupe tombe dessus
    .replace(/-+$/, '');
}

/**
 * Génère un slug alternatif en ajoutant un suffixe numérique
 * @param baseSlug - Le slug de base
 * @param counter - Le compteur pour le suffixe
 * @returns Le slug avec suffixe
 */
export function generateAlternativeSlug(baseSlug: string, counter: number): string {
  return `${baseSlug}-${counter}`;
}
