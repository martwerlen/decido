"use client"

import { useOrganizationMemory } from "@/lib/useOrganizationMemory"

interface OrganizationMemoryUpdaterProps {
  organizationSlug: string
}

/**
 * Composant client pour mettre à jour la mémorisation de l'organisation
 * À placer dans le layout ou la page d'organisation
 */
export default function OrganizationMemoryUpdater({
  organizationSlug
}: OrganizationMemoryUpdaterProps) {
  useOrganizationMemory(organizationSlug)
  return null
}
