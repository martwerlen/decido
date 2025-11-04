"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useDarkMode } from "@/components/providers/DarkModeProvider"
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
  Search,
  Add,
  Settings,
  AccountTree,
  Person,
  Group,
  Logout,
  AdminPanelSettings,
  AccessTime,
  ThumbUp,
  Visibility,
  CheckCircle,
  Cancel,
  ErrorOutline,
  MoreHoriz,
  QrCode2,
} from "@mui/icons-material"
import Image from "next/image"
import { signOut } from "next-auth/react"
import { useSidebarRefresh } from "@/components/providers/SidebarRefreshProvider"

const drawerWidth = 280

interface OngoingDecision {
  id: string
  title: string
  status: string
  votingMode: string
  isCreator: boolean
  isParticipant: boolean
  hasVoted: boolean
}

interface CompletedDecision {
  id: string
  title: string
  status: string
  result: string | null
  votingMode: string
  isCreator: boolean
}

interface SidebarDecisions {
  ongoing: OngoingDecision[]
  ongoingTotal: number
  completed: CompletedDecision[]
  completedTotal: number
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
  members?: Array<{
    role: string
    userId: string
  }>
}

interface SidebarProps {
  currentOrgSlug?: string
}

// Helper pour obtenir l'icône et la couleur des décisions en cours
const getOngoingIcon = (decision: OngoingDecision) => {
  // Décision PUBLIC_LINK dont l'utilisateur est le créateur
  if (decision.votingMode === 'PUBLIC_LINK' && decision.isCreator) {
    return { Icon: QrCode2, color: "primary.main" }
  }
  if (!decision.isParticipant) {
    return { Icon: Visibility, color: "action.active" }
  }
  if (decision.hasVoted) {
    return { Icon: ThumbUp, color: "success.main" }
  }
  return { Icon: AccessTime, color: "warning.main" }
}

// Helper pour obtenir l'icône et la couleur des décisions terminées
const getCompletedIcon = (decision: CompletedDecision) => {
  if (decision.status === "WITHDRAWN") {
    return { Icon: Cancel, color: "error.main" }
  }
  if (decision.result === "REJECTED" || decision.result === "BLOCKED") {
    return { Icon: ErrorOutline, color: "warning.main" }
  }
  if (decision.result === "APPROVED") {
    return { Icon: CheckCircle, color: "success.main" }
  }
  return { Icon: CheckCircle, color: "action.active" }
}

export default function Sidebar({ currentOrgSlug }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isDarkMode } = useDarkMode()
  const [open, setOpen] = useState(true)
  const [organization, setOrganization] = useState(currentOrgSlug || "")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [decisions, setDecisions] = useState<SidebarDecisions>({
    ongoing: [],
    ongoingTotal: 0,
    completed: [],
    completedTotal: 0,
  })
  const [decisionsLoading, setDecisionsLoading] = useState(false)
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const { refreshTrigger } = useSidebarRefresh()
  const decisionsContainerRef = useRef<HTMLDivElement>(null)
  const [maxDecisions, setMaxDecisions] = useState({ ongoing: 10, completed: 10 })

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

  // Rafraîchir quand le trigger change (après un vote ou changement de statut)
  useEffect(() => {
    if (refreshTrigger > 0 && organization) {
      fetchDecisions()
    }
  }, [refreshTrigger, organization, fetchDecisions])

  // Mettre à jour le rôle de l'utilisateur dans l'organisation courante
  useEffect(() => {
    if (!organization || !session?.user?.id || organizations.length === 0) {
      setCurrentUserRole(null)
      return
    }

    const currentOrg = organizations.find((org) => org.slug === organization)
    if (!currentOrg?.members) {
      setCurrentUserRole(null)
      return
    }

    const membership = currentOrg.members.find((m) => m.userId === session.user.id)
    setCurrentUserRole(membership?.role || null)
  }, [organization, session?.user?.id, organizations])

  // Calculer le nombre max de décisions affichables
  useEffect(() => {
    const calculateMaxDecisions = () => {
      if (!decisionsContainerRef.current) return

      const containerHeight = decisionsContainerRef.current.clientHeight
      const itemHeight = 40 // Hauteur approximative d'un item de décision (réduite)
      const sectionHeaderHeight = 40 // Hauteur du titre de section
      const availableHeight = containerHeight - (sectionHeaderHeight * 2) // 2 sections

      const maxPerSection = Math.floor(availableHeight / 2 / itemHeight)
      setMaxDecisions({ ongoing: maxPerSection, completed: maxPerSection })
    }

    calculateMaxDecisions()
    window.addEventListener("resize", calculateMaxDecisions)
    return () => window.removeEventListener("resize", calculateMaxDecisions)
  }, [open])

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

    // Rediriger vers la page de l'organisation pour forcer le rafraîchissement
    router.push(`/organizations/${selectedSlug}`)
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
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 40, width: "100%" }}>
                <Image
                  src={isDarkMode ? "/logo-dark.svg" : "/logo.svg"}
                  alt="Decidoo"
                  width={150}
                  height={40}
                  style={{ objectFit: "contain" }}
                  priority
                />
              </Box>
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

        {/* Container pour les décisions (avec ref pour calculer la hauteur) */}
        {open && (
          <Box ref={decisionsContainerRef} sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Décisions en cours */}
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  "&:hover": { color: "primary.main" }
                }}
                onClick={() => router.push(`/organizations/${organization}`)}
              >
                <span>En cours</span>
                {decisions.ongoingTotal > maxDecisions.ongoing && (
                  <IconButton size="small" sx={{ p: 0 }}>
                    <MoreHoriz fontSize="small" />
                  </IconButton>
                )}
              </Typography>
              <List dense sx={{ py: 0 }}>
                {decisionsLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : decisions.ongoing.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.5, fontStyle: "italic", display: "block" }}>
                    Aucune décision en cours
                  </Typography>
                ) : (
                  <>
                    {decisions.ongoing.slice(0, maxDecisions.ongoing).map((decision) => {
                      const { Icon, color } = getOngoingIcon(decision)
                      // Déterminer l'URL de destination
                      const targetUrl = decision.votingMode === 'PUBLIC_LINK' && decision.isCreator
                        ? `/organizations/${organization}/decisions/${decision.id}/share`
                        : `/organizations/${organization}/decisions/${decision.id}/vote`

                      return (
                        <ListItem key={decision.id} disablePadding sx={{ mb: 0.25 }}>
                          <ListItemButton
                            onClick={() => router.push(targetUrl)}
                            sx={{
                              py: 0.5,
                              px: 1,
                              borderRadius: 0.5,
                              minHeight: 36
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <Icon fontSize="small" sx={{ color }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={decision.title}
                              primaryTypographyProps={{
                                variant: "caption",
                                noWrap: true,
                                sx: { overflow: 'hidden', textOverflow: 'ellipsis' }
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      )
                    })}
                  </>
                )}
              </List>
            </Box>

            <Divider />

            {/* Décisions terminées */}
            <Box sx={{ p: 2, pt: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  "&:hover": { color: "primary.main" }
                }}
                onClick={() => router.push(`/organizations/${organization}`)}
              >
                <span>Terminées</span>
                {decisions.completedTotal > maxDecisions.completed && (
                  <IconButton size="small" sx={{ p: 0 }}>
                    <MoreHoriz fontSize="small" />
                  </IconButton>
                )}
              </Typography>
              <List dense sx={{ py: 0 }}>
                {decisionsLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : decisions.completed.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.5, fontStyle: "italic", display: "block" }}>
                    Aucune décision terminée
                  </Typography>
                ) : (
                  <>
                    {decisions.completed.slice(0, maxDecisions.completed).map((decision) => {
                      const { Icon, color } = getCompletedIcon(decision)
                      return (
                        <ListItem key={decision.id} disablePadding sx={{ mb: 0.25 }}>
                          <ListItemButton
                            onClick={() => router.push(`/organizations/${organization}/decisions/${decision.id}/results`)}
                            sx={{
                              py: 0.5,
                              px: 1,
                              borderRadius: 0.5,
                              minHeight: 36
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <Icon fontSize="small" sx={{ color }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={decision.title}
                              primaryTypographyProps={{
                                variant: "caption",
                                noWrap: true,
                                sx: { overflow: 'hidden', textOverflow: 'ellipsis' }
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      )
                    })}
                  </>
                )}
              </List>
            </Box>
          </Box>
        )}

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
          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
            <MenuItem onClick={handleOrganizationSettings} disabled={!organization}>
              <ListItemIcon>
                <AdminPanelSettings fontSize="small" />
              </ListItemIcon>
              <ListItemText>Paramètres de l&apos;organisation</ListItemText>
            </MenuItem>
          )}
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
