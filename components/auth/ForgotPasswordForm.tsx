"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material"

export default function ForgotPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue")
      } else {
        setSuccess(true)
        setEmail("")
      }
    } catch (error) {
      setError("Une erreur est survenue. Veuillez réessayer.")
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

      {success && (
        <Alert severity="success">
          Un email de réinitialisation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.
        </Alert>
      )}

      <TextField
        id="email"
        label="Adresse email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
        disabled={isLoading || success}
        placeholder="votre@email.com"
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={isLoading || success}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
      >
        {isLoading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
      </Button>
    </Box>
  )
}
