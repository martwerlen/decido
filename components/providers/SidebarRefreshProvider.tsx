"use client"

import { createContext, useContext, useCallback, useState } from "react"

interface SidebarRefreshContextType {
  refreshSidebar: () => void
  refreshTrigger: number
}

const SidebarRefreshContext = createContext<SidebarRefreshContextType | undefined>(undefined)

export function SidebarRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refreshSidebar = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  return (
    <SidebarRefreshContext.Provider value={{ refreshSidebar, refreshTrigger }}>
      {children}
    </SidebarRefreshContext.Provider>
  )
}

export function useSidebarRefresh() {
  const context = useContext(SidebarRefreshContext)
  if (context === undefined) {
    throw new Error("useSidebarRefresh must be used within a SidebarRefreshProvider")
  }
  return context
}
