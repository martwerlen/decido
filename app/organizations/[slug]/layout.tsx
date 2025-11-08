import { Box } from "@mui/material"
import Sidebar from "@/components/dashboard/Sidebar"
import OrganizationMemoryUpdater from "@/components/OrganizationMemoryUpdater"

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <OrganizationMemoryUpdater organizationSlug={slug} />
      <Sidebar currentOrgSlug={slug} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          overflow: "auto",
          pt: { xs: '56px', md: 0 }, // Padding for fixed AppBar on mobile
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
