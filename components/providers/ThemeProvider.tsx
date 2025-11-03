"use client"

import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import { useMemo } from "react"
import { useDarkMode } from "./DarkModeProvider"

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useDarkMode()

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? "dark" : "light",
          primary: {
            main: isDarkMode ? "#5da370" : "#4a7c59",
            light: isDarkMode ? "#72b585" : "#5da370",
            dark: isDarkMode ? "#4a7c59" : "#3d6449",
            contrastText: "#ffffff",
          },
          secondary: {
            main: isDarkMode ? "#e5a484" : "#d4896b",
            light: isDarkMode ? "#f0c0a8" : "#efb49a",
            contrastText: "#ffffff",
          },
          error: {
            main: isDarkMode ? "#d88777" : "#cb6e5e",
            light: isDarkMode ? "#e0a79c" : "#eac5be",
          },
          warning: {
            main: isDarkMode ? "#e5a484" : "#d4896b",
          },
          info: {
            main: isDarkMode ? "#8a9a8a" : "#5a6d5a",
          },
          success: {
            main: isDarkMode ? "#5da370" : "#4a7c59",
          },
          background: {
            default: isDarkMode ? "#1a2520" : "#ffffff",
            paper: isDarkMode ? "#243329" : "#f9faf9",
          },
          text: {
            primary: isDarkMode ? "#e8ede8" : "#2d3a2d",
            secondary: isDarkMode ? "#b8c4b8" : "#5a6d5a",
          },
        },
        typography: {
          fontFamily: [
            "var(--font-poppins)",
            "-apple-system",
            "BlinkMacSystemFont",
            '"Segoe UI"',
            "Roboto",
            '"Helvetica Neue"',
            "Arial",
            "sans-serif",
          ].join(","),
          h1: {
            fontWeight: 700,
            fontSize: "2.5rem",
          },
          h2: {
            fontWeight: 600,
            fontSize: "2rem",
          },
          h3: {
            fontWeight: 600,
            fontSize: "1.75rem",
          },
          h4: {
            fontWeight: 500,
            fontSize: "1.5rem",
          },
          h5: {
            fontWeight: 500,
            fontSize: "1.25rem",
          },
          h6: {
            fontWeight: 500,
            fontSize: "1rem",
          },
          body1: {
            fontWeight: 400,
            fontSize: "1rem",
            lineHeight: 1.6,
          },
          body2: {
            fontWeight: 400,
            fontSize: "0.875rem",
            lineHeight: 1.6,
          },
          button: {
            fontWeight: 500,
            textTransform: "none",
          },
        },
        shape: {
          borderRadius: 8,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                padding: "10px 24px",
                fontWeight: 500,
                transition: "all 0.3s",
              },
              contained: {
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(74, 124, 89, 0.2)",
                },
              },
              outlined: {
                borderWidth: 2,
                "&:hover": {
                  borderWidth: 2,
                  backgroundColor: isDarkMode ? "rgba(93, 163, 112, 0.08)" : "rgba(74, 124, 89, 0.08)",
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                border: `2px solid ${isDarkMode ? "#3d4f45" : "#e5ebe5"}`,
                boxShadow: isDarkMode
                  ? "0 4px 12px rgba(0, 0, 0, 0.3)"
                  : "0 4px 12px rgba(74, 124, 89, 0.08)",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
              elevation1: {
                boxShadow: isDarkMode
                  ? "0 2px 8px rgba(0, 0, 0, 0.3)"
                  : "0 2px 8px rgba(74, 124, 89, 0.08)",
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                "& .MuiOutlinedInput-root": {
                  borderRadius: 8,
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                fontWeight: 500,
              },
            },
          },
        },
      }),
    [isDarkMode]
  )

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
