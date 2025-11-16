"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"

/**
 * Hook pour mémoriser l'organisation active de l'utilisateur
 * Appelle ce hook sur les pages d'organisation pour sauvegarder le slug
 */
export function useOrganizationMemory(organizationSlug: string | null | undefined) {
  const { data: session, update } = useSession()

  useEffect(() => {
    // Ne rien faire si pas de slug ou déjà mémorisé
    if (!organizationSlug || session?.user?.lastOrganizationSlug === organizationSlug) {
      return
    }

    // Mettre à jour la session avec le nouveau slug
    update({
      lastOrganizationSlug: organizationSlug,
    })
  }, [organizationSlug, session?.user?.lastOrganizationSlug, update])
}

/**
 * Obtenir l'URL de redirection après connexion
 * Redirige vers la dernière organisation visitée ou le dashboard
 */
export function getRedirectAfterSignIn(session: any): string {
  if (session?.user?.lastOrganizationSlug) {
    return `/${session.user.lastOrganizationSlug}`
  }
  return "/"
}
