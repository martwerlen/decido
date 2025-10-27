"use client"

import { useSession } from "next-auth/react"
import LoginPage from "@/components/auth/LoginPage"
import Dashboard from "@/components/dashboard/Dashboard"
import { Box, CircularProgress } from "@mui/material"

export default function Home() {
  const { data: session, status } = useSession()

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

  // Si l'utilisateur est connecté, afficher le dashboard
  return <Dashboard />
}
