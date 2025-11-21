"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CancelIcon from "@mui/icons-material/Cancel"

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "Au moins 8 caractères", test: (pwd) => pwd.length >= 8 },
  { label: "Au moins une lettre majuscule", test: (pwd) => /[A-Z]/.test(pwd) },
  { label: "Au moins une lettre minuscule", test: (pwd) => /[a-z]/.test(pwd) },
  { label: "Au moins un chiffre", test: (pwd) => /[0-9]/.test(pwd) },
  { label: "Au moins un caractère spécial (!@#$%^&*...)", test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) },
]

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("Lien de réinitialisation invalide. Veuillez faire une nouvelle demande.")
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!token) {
      setError("Lien de réinitialisation invalide")
      return
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue")
      } else {
        setSuccess(true)
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          router.push("/auth/signin")
        }, 2000)
      }
    } catch (error) {
      setError("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <Alert severity="error">
        Lien de réinitialisation invalide. Veuillez faire une nouvelle{" "}
        <Link href="/auth/forgot-password" style={{ color: "inherit", textDecoration: "underline" }}>
          demande de réinitialisation
        </Link>
        .
      </Alert>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success">
          Votre mot de passe a été réinitialisé avec succès. Redirection vers la page de connexion...
        </Alert>
      )}

      <TextField
        id="password"
        label="Nouveau mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        disabled={isLoading || success}
      />

      <TextField
        id="confirmPassword"
        label="Confirmer le nouveau mot de passe"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        fullWidth
        disabled={isLoading || success}
      />

      {password && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Exigences du mot de passe :
          </Typography>
          <List dense>
            {passwordRequirements.map((req, index) => {
              const isMet = req.test(password)
              return (
                <ListItem key={index} sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {isMet ? (
                      <CheckCircleIcon fontSize="small" color="success" />
                    ) : (
                      <CancelIcon fontSize="small" color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={req.label}
                    primaryTypographyProps={{
                      variant: "body2",
                      color: isMet ? "success.main" : "error.main"
                    }}
                  />
                </ListItem>
              )
            })}
          </List>
        </Box>
      )}

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={isLoading || success || !token}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
        sx={{ mt: 2 }}
      >
        {isLoading ? "Réinitialisation..." : "Réinitialiser mon mot de passe"}
      </Button>
    </Box>
  )
}
