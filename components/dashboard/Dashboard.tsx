"use client"

import { Box, Typography } from "@mui/material"
import Sidebar from "./Sidebar"

export default function Dashboard() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      {/* Zone principale */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Bienvenue sur Decidoo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sélectionnez une décision dans le menu pour commencer.
        </Typography>
      </Box>
    </Box>
  )
}
