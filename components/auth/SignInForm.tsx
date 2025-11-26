"use client"

import { useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from "@mui/material"

export default function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("inviteToken")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Email ou mot de passe incorrect")
      } else {
        // Si un token d'invitation est présent, rediriger vers la page d'acceptation
        if (inviteToken) {
          router.push(`/join/${inviteToken}`)
          return
        }

        // Sinon, récupérer la session pour obtenir lastOrganizationSlug
        const response = await fetch("/api/auth/session")
        const session = await response.json()

        // Rediriger vers la dernière organisation ou la création d'organisation
        if (session?.user?.lastOrganizationSlug) {
          router.push(`/${session.user.lastOrganizationSlug}`)
        } else {
          router.push("/create-organization")
        }
        router.refresh()
      }
    } catch (error) {
      setError("Une erreur s'est produite. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      <TextField
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
        disabled={isLoading}
      />

      <TextField
        id="password"
        label="Mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        disabled={isLoading}
      />

      <Box sx={{ textAlign: 'right' }}>
        <MuiLink
          component={Link}
          href="/auth/forgot-password"
          color="primary"
          variant="body2"
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Mot de passe oublié ?
        </MuiLink>
      </Box>

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
      >
        {isLoading ? "Connexion..." : "Se connecter"}
      </Button>
    </Box>
  )
}
