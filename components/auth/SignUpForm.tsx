"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
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
  IconButton,
  InputAdornment,
} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CancelIcon from "@mui/icons-material/Cancel"
import Visibility from "@mui/icons-material/Visibility"
import VisibilityOff from "@mui/icons-material/VisibilityOff"

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

export default function SignUpForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    // Vérifier que toutes les exigences sont respectées
    const allRequirementsMet = passwordRequirements.every(req => req.test(password))
    if (!allRequirementsMet) {
      setError("Le mot de passe ne respecte pas toutes les exigences de sécurité")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Une erreur s'est produite")
        return
      }

      // Connecter automatiquement l'utilisateur après inscription
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError("Inscription réussie, mais erreur de connexion automatique. Veuillez vous connecter manuellement.")
        router.push("/auth/signin?registered=true")
        return
      }

      // Rediriger vers la page d'accueil ou l'organisation
      router.push("/")
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
        id="name"
        label="Nom"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        fullWidth
        disabled={isLoading}
      />

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
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        disabled={isLoading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {password && (
        <Box>
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

      <TextField
        id="confirmPassword"
        label="Confirmer le mot de passe"
        type={showConfirmPassword ? "text" : "password"}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        fullWidth
        disabled={isLoading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle confirm password visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
      >
        {isLoading ? "Inscription..." : "S'inscrire"}
      </Button>
    </Box>
  )
}
