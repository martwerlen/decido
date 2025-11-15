import Link from "next/link"
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm"
import { Box, Container, Typography, Card, CardContent, Link as MuiLink } from "@mui/material"

export default function ForgotPasswordPage() {
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
            Mot de passe oublié ?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Entrez votre adresse email pour recevoir un lien de réinitialisation
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <ForgotPasswordForm />
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Vous vous souvenez de votre mot de passe ?{" "}
            <MuiLink component={Link} href="/auth/signin" color="primary" fontWeight="500">
              Se connecter
            </MuiLink>
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
