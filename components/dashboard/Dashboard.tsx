"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Box,
  Drawer,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material"
import {
  ChevronLeft,
  ChevronRight,
  Business,
  Article,
  HowToVote,
  CheckCircle,
  Search,
  Help,
  Logout,
  Add,
  People,
} from "@mui/icons-material"
import { signOut } from "next-auth/react"

const drawerWidth = 280

interface Decision {
  id: number
  title: string
}

interface Organization {
  id: string
  name: string
  description?: string
  slug: string
  _count?: {
    members: number
    decisions: number
  }
}

// Données temporaires pour l'affichage
const ongoingDecisions: Decision[] = [
  { id: 1, title: "Budget annuel 2025" },
  { id: 2, title: "Nouvelle politique télétravail" },
  { id: 3, title: "Choix fournisseur IT" },
  { id: 4, title: "Projet expansion Europe" },
]

const completedDecisions: Decision[] = [
  { id: 5, title: "Embauche développeur senior" },
  { id: 6, title: "Renouvellement locaux" },
  { id: 7, title: "Plan formation 2024" },
  { id: 8, title: "Partenariat stratégique" },
]

export default function Dashboard() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [organization, setOrganization] = useState("")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch("/api/organizations")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des organisations")
      }

      setOrganizations(data)

      // Sélectionner la première organisation par défaut
      if (data.length > 0 && !organization) {
        setOrganization(data[0].id)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [organization])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  const handleDrawerToggle = () => {
    setOpen(!open)
  }

  const handleOrganizationChange = (event: SelectChangeEvent) => {
    setOrganization(event.target.value)
  }

  const handleLogout = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleCreateOrganization = () => {
    router.push("/organizations/new")
  }

  const handleManageMembers = () => {
    if (organization) {
      router.push(`/organizations/${organization}/members`)
    }
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : 60,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: open ? drawerWidth : 60,
            boxSizing: "border-box",
            transition: (theme) =>
              theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            overflowX: "hidden",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header avec toggle */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              p: 1,
            }}
          >
            <IconButton onClick={handleDrawerToggle}>
              {open ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
          </Box>

          <Divider />

          {/* Sélecteur d'organisation */}
          {open && (
            <Box sx={{ p: 2 }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              ) : organizations.length > 0 ? (
                <>
                  <FormControl fullWidth size="small">
                    <Select
                      value={organization}
                      onChange={handleOrganizationChange}
                      startAdornment={<Business sx={{ mr: 1, color: "action.active" }} />}
                    >
                      {organizations.map((org) => (
                        <MenuItem key={org.id} value={org.id}>
                          {org.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<People />}
                    onClick={handleManageMembers}
                    disabled={!organization}
                    sx={{ mt: 1 }}
                  >
                    Gérer les membres
                  </Button>
                </>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Aucune organisation
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={handleCreateOrganization}
                sx={{ mt: 1 }}
              >
                Nouvelle organisation
              </Button>
            </Box>
          )}

          {!open && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Business />
            </Box>
          )}

          <Divider />

          {/* Actualités */}
          {open && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Actualités
              </Typography>
              <List dense>
                <ListItem disablePadding>
                  <ListItemButton>
                    <ListItemIcon>
                      <Article fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Nouveau mode de décision"
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton>
                    <ListItemIcon>
                      <Article fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Mise à jour v2.0"
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>
          )}

          <Divider />

          {/* Décisions en cours */}
          {open && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Décisions en cours
              </Typography>
              <List dense>
                {ongoingDecisions.map((decision) => (
                  <ListItem key={decision.id} disablePadding>
                    <ListItemButton>
                      <ListItemIcon>
                        <HowToVote fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={decision.title}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Divider />

          {/* Décisions terminées */}
          {open && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Décisions terminées
              </Typography>
              <List dense>
                {completedDecisions.map((decision) => (
                  <ListItem key={decision.id} disablePadding>
                    <ListItemButton>
                      <ListItemIcon>
                        <CheckCircle fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={decision.title}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Spacer pour pousser les éléments suivants vers le bas */}
          <Box sx={{ flexGrow: 1 }} />

          <Divider />

          {/* Rechercher et Aide */}
          <List>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <Search />
                </ListItemIcon>
                {open && <ListItemText primary="Rechercher" />}
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <Help />
                </ListItemIcon>
                {open && <ListItemText primary="Aide" />}
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                  <Logout />
                </ListItemIcon>
                {open && <ListItemText primary="Déconnexion" />}
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

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
          Bienvenue sur Decido
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sélectionnez une décision dans le menu pour commencer.
        </Typography>
      </Box>
    </Box>
  )
}
