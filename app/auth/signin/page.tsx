import Link from "next/link"
import { Suspense } from "react"
import SignInForm from "@/components/auth/SignInForm"
import { Box, Container, Typography, Card, CardContent, Link as MuiLink, CircularProgress } from "@mui/material"

export default function SignInPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 6,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
            Connexion à Decidoo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ou{" "}
            <MuiLink component={Link} href="/auth/signup" color="primary" fontWeight="500">
              créez un nouveau compte
            </MuiLink>
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>}>
              <SignInForm />
            </Suspense>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
