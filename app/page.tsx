"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import LoginPage from "@/components/auth/LoginPage"
import { Box, CircularProgress } from "@mui/material"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Rediriger vers la dernière organisation visitée si l'utilisateur est connecté
  useEffect(() => {
    if (status === "authenticated" && session?.user?.lastOrganizationSlug) {
      router.replace(`/${session.user.lastOrganizationSlug}`)
    }
  }, [status, session, router])

  // Affichage du loader pendant le chargement de la session
  if (status === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  // Si l'utilisateur n'est pas connecté, afficher la page de connexion
  if (!session) {
    return <LoginPage />
  }

  // Si l'utilisateur est connecté mais n'a pas encore de lastOrganizationSlug,
  // afficher le loader pendant la redirection
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <CircularProgress />
    </Box>
  )
}
