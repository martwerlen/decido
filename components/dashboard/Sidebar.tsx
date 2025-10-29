"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
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
  CircularProgress,
  Alert,
  Menu,
} from "@mui/material"
import {
  ChevronLeft,
  ChevronRight,
  Business,
  Article,
  HowToVote,
  CheckCircle,
  Search,
  Add,
  Settings,
  AccountTree,
  Person,
  Group,
  Logout,
  AdminPanelSettings,
} from "@mui/icons-material"
import { signOut } from "next-auth/react"

const drawerWidth = 280

interface Decision {
  id: string
  title: string
  endDate?: Date | null
  decidedAt?: Date | null
  result?: string | null
}

interface SidebarDecisions {
  awaitingParticipation: Decision[]
  awaitingParticipationTotal: number
  ongoingDecisions: Decision[]
  ongoingDecisionsTotal: number
  completedDecisions: Decision[]
  completedDecisionsTotal: number
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

interface SidebarProps {
  currentOrgSlug?: string
}

export default function Sidebar({ currentOrgSlug }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(true)
  const [organization, setOrganization] = useState(currentOrgSlug || "")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [decisions, setDecisions] = useState<SidebarDecisions>({
    awaitingParticipation: [],
    awaitingParticipationTotal: 0,
    ongoingDecisions: [],
    ongoingDecisionsTotal: 0,
    completedDecisions: [],
    completedDecisionsTotal: 0,
  })
  const [decisionsLoading, setDecisionsLoading] = useState(false)
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null)

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch("/api/organizations")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des organisations")
      }

      setOrganizations(data)

      // Sélectionner l'organisation courante ou la première par défaut
      if (currentOrgSlug) {
        setOrganization(currentOrgSlug)
      } else if (data.length > 0 && !organization) {
        setOrganization(data[0].slug)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentOrgSlug, organization])

  const fetchDecisions = useCallback(async () => {
    if (!organization) return

    setDecisionsLoading(true)
    try {
      const response = await fetch(`/api/organizations/${organization}/decisions/sidebar`)
      const data = await response.json()

      if (response.ok) {
        setDecisions(data)
      }
    } catch (err: any) {
      console.error("Error fetching decisions:", err)
    } finally {
      setDecisionsLoading(false)
    }
  }, [organization])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    if (organization) {
      fetchDecisions()
    }
  }, [organization, fetchDecisions])

  const handleDrawerToggle = () => {
    setOpen(!open)
  }

  const handleOrganizationChange = (event: SelectChangeEvent) => {
    const selectedSlug = event.target.value

    if (selectedSlug === "__new__") {
      router.push("/organizations/new")
      return
    }

    setOrganization(selectedSlug)

    // Rediriger vers le dashboard si on change d'organisation
    if (pathname === "/") {
      // On est déjà sur le dashboard, pas besoin de rediriger
    } else {
      router.push("/")
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsMenuAnchor(event.currentTarget)
  }

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchor(null)
  }

  const handleProfileSettings = () => {
    router.push("/settings/profile")
    handleSettingsMenuClose()
  }

  const handleOrganizationSettings = () => {
    if (organization) {
      router.push(`/organizations/${organization}/settings`)
    }
    handleSettingsMenuClose()
  }

  const handleMembers = () => {
    if (organization) {
      router.push(`/organizations/${organization}/members`)
    }
    handleSettingsMenuClose()
  }

  const handleLogoutFromMenu = () => {
    handleSettingsMenuClose()
    handleLogout()
  }

  const handleTeams = () => {
    if (organization) {
      router.push(`/organizations/${organization}/teams`)
    }
  }

  return (
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
        {/* Logo DECIDOO */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "space-between" : "center",
            p: 2,
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
          onClick={() => organization && router.push(`/organizations/${organization}`)}
        >
          {open ? (
            <>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                DECIDOO
              </Typography>
              <IconButton onClick={(e) => {
                e.stopPropagation();
                handleDrawerToggle();
              }} size="small">
                <ChevronLeft />
              </IconButton>
            </>
          ) : (
            <IconButton onClick={handleDrawerToggle} size="small">
              <ChevronRight />
            </IconButton>
          )}
        </Box>

        <Divider />

        {/* Header avec toggle - SUPPRIMÉ car maintenant dans le logo */}
        {/* <Box
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

        <Divider /> */}

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
            ) : (
              <FormControl fullWidth size="small">
                <Select
                  value={organization || ""}
                  onChange={handleOrganizationChange}
                  startAdornment={<Business sx={{ mr: 1, color: "action.active" }} />}
                  displayEmpty
                >
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.slug}>
                      {org.name}
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem value="__new__">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Add fontSize="small" />
                      <span>Nouvelle organisation</span>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        {!open && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Business />
          </Box>
        )}

        <Divider />

        {/* Organigramme */}
        {open && (
          <Box sx={{ p: 2 }}>
            <List dense>
              <ListItem disablePadding>
                <ListItemButton onClick={handleTeams} disabled={!organization}>
                  <ListItemIcon>
                    <AccountTree fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Organigramme"
                    primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        )}

        <Divider />

        {/* Nouvelle décision */}
        {open && (
          <Box sx={{ p: 2, pb: 0 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => organization && router.push(`/organizations/${organization}/decisions/new`)}
                disabled={!organization}
                sx={{
                  backgroundColor: "primary.main",
                  color: "white",
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "primary.dark",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "action.disabledBackground",
                    color: "action.disabled",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                  <Add fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Nouvelle décision"
                  primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          </Box>
        )}

        {/* Participation attendue */}
        {open && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              Participation attendue
              {decisions.awaitingParticipation.length > 0 && (
                <Box component="span" sx={{
                  backgroundColor: "error.main",
                  color: "white",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "bold"
                }}>
                  {decisions.awaitingParticipation.length}
                </Box>
              )}
            </Typography>
            <List dense>
              {decisionsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : decisions.awaitingParticipation.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1, fontStyle: "italic" }}>
                  Aucune participation attendue
                </Typography>
              ) : (
                <>
                  {decisions.awaitingParticipation.map((decision) => (
                    <ListItem key={decision.id} disablePadding>
                      <ListItemButton
                        onClick={() => router.push(`/organizations/${organization}/decisions/${decision.id}/vote`)}
                        sx={{
                          backgroundColor: "warning.light",
                          mb: 0.5,
                          borderRadius: 1,
                          "&:hover": {
                            backgroundColor: "warning.main",
                          }
                        }}
                      >
                        <ListItemIcon>
                          <HowToVote fontSize="small" color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={decision.title}
                          primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                  {decisions.awaitingParticipationTotal > 5 && (
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => router.push(`/organizations/${organization}/decisions`)}
                        sx={{ justifyContent: "center", color: "primary.main" }}
                      >
                        <Add fontSize="small" />
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                          Voir toutes ({decisions.awaitingParticipationTotal})
                        </Typography>
                      </ListItemButton>
                    </ListItem>
                  )}
                </>
              )}
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
              {decisionsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : decisions.ongoingDecisions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1, fontStyle: "italic" }}>
                  Aucune décision en cours
                </Typography>
              ) : (
                <>
                  {decisions.ongoingDecisions.map((decision) => (
                    <ListItem key={decision.id} disablePadding>
                      <ListItemButton onClick={() => router.push(`/organizations/${organization}/decisions/${decision.id}/vote`)}>
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
                  {decisions.ongoingDecisionsTotal > 5 && (
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => router.push(`/organizations/${organization}/decisions`)}
                        sx={{ justifyContent: "center", color: "primary.main" }}
                      >
                        <Add fontSize="small" />
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                          Voir toutes ({decisions.ongoingDecisionsTotal})
                        </Typography>
                      </ListItemButton>
                    </ListItem>
                  )}
                </>
              )}
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
              {decisionsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : decisions.completedDecisions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1, fontStyle: "italic" }}>
                  Aucune décision terminée
                </Typography>
              ) : (
                <>
                  {decisions.completedDecisions.map((decision) => (
                    <ListItem key={decision.id} disablePadding>
                      <ListItemButton onClick={() => router.push(`/organizations/${organization}/decisions/${decision.id}/results`)}>
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
                  {decisions.completedDecisionsTotal > 5 && (
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => router.push(`/organizations/${organization}/decisions`)}
                        sx={{ justifyContent: "center", color: "primary.main" }}
                      >
                        <Add fontSize="small" />
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                          Voir toutes ({decisions.completedDecisionsTotal})
                        </Typography>
                      </ListItemButton>
                    </ListItem>
                  )}
                </>
              )}
            </List>
          </Box>
        )}

        {/* Spacer pour pousser les éléments suivants vers le bas */}
        <Box sx={{ flexGrow: 1 }} />

        <Divider />

        {/* Rechercher et Paramètres */}
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
            <ListItemButton onClick={handleSettingsClick}>
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              {open && <ListItemText primary="Paramètres" />}
            </ListItemButton>
          </ListItem>
        </List>

        {/* Menu déroulant des paramètres */}
        <Menu
          anchorEl={settingsMenuAnchor}
          open={Boolean(settingsMenuAnchor)}
          onClose={handleSettingsMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={handleProfileSettings}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            <ListItemText>Modifier mon profil</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleOrganizationSettings} disabled={!organization}>
            <ListItemIcon>
              <AdminPanelSettings fontSize="small" />
            </ListItemIcon>
            <ListItemText>Paramètres de l&apos;organisation</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleMembers} disabled={!organization}>
            <ListItemIcon>
              <Group fontSize="small" />
            </ListItemIcon>
            <ListItemText>Gérer les membres</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogoutFromMenu}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText>Se déconnecter</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Drawer>
  )
}
