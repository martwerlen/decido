import { Suspense } from "react"
import Link from "next/link"
import ResetPasswordForm from "@/components/auth/ResetPasswordForm"
import { Box, Container, Typography, Card, CardContent, Link as MuiLink, CircularProgress } from "@mui/material"

export default function ResetPasswordPage() {
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
            Réinitialiser votre mot de passe
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Choisissez un nouveau mot de passe sécurisé
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Retour à la{" "}
            <MuiLink component={Link} href="/auth/signin" color="primary" fontWeight="500">
              connexion
            </MuiLink>
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
