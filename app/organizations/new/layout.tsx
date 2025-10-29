"use client"

import { Box } from "@mui/material"
import Sidebar from "@/components/dashboard/Sidebar"

export default function NewOrganizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          overflow: "auto",
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
