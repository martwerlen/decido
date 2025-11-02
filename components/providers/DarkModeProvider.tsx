"use client"

import { createContext, useContext, useEffect, useState } from "react"

type DarkModeContextType = {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (isDark: boolean) => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Load dark mode preference from localStorage on mount
    const savedMode = localStorage.getItem("darkMode")
    if (savedMode !== null) {
      const isDark = savedMode === "true"
      setIsDarkMode(isDark)
      updateTheme(isDark)
    }
  }, [])

  const updateTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark")
    } else {
      document.documentElement.removeAttribute("data-theme")
    }
  }

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newValue = !prev
      localStorage.setItem("darkMode", String(newValue))
      updateTheme(newValue)
      return newValue
    })
  }

  const setDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem("darkMode", String(isDark))
    updateTheme(isDark)
  }

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error("useDarkMode must be used within a DarkModeProvider")
  }
  return context
}
