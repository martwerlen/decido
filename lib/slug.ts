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
