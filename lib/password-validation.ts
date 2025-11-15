/**
 * Validation de la force du mot de passe
 *
 * Exigences :
 * - Minimum 8 caractères
 * - Au moins 1 majuscule
 * - Au moins 1 minuscule
 * - Au moins 1 chiffre
 * - Au moins 1 caractère spécial
 */

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  // Vérifier la longueur minimale
  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères")
  }

  // Vérifier la présence d'une majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre majuscule")
  }

  // Vérifier la présence d'une minuscule
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre minuscule")
  }

  // Vérifier la présence d'un chiffre
  if (!/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre")
  }

  // Vérifier la présence d'un caractère spécial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*()_+-=[]{}etc.)")
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Retourne un message d'aide pour la création de mot de passe
 */
export function getPasswordRequirements(): string {
  return "Le mot de passe doit contenir au moins 8 caractères, incluant une majuscule, une minuscule, un chiffre et un caractère spécial."
}
