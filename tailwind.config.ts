import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base colors
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Primary colors
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          lighter: "var(--color-primary-lighter)",
          dark: "var(--color-primary-dark)",
        },

        // Secondary colors
        secondary: {
          DEFAULT: "var(--color-secondary)",
          light: "var(--color-secondary-light)",
        },

        // Accent colors
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
        },

        // Text colors
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          light: "var(--color-text-light)",
        },

        // Background colors
        bg: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
          accent: "var(--color-bg-accent)",
        },

        // Border colors
        border: {
          light: "var(--color-border-light)",
          medium: "var(--color-border-medium)",
        },

        // Semantic colors
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
      },
      fontFamily: {
        poppins: ["var(--font-poppins)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
