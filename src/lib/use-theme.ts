import { useEffect, useState } from "react"

export type ThemeMode = "dark" | "light"

export const THEME_STORAGE_KEY = "trait-ui-theme"

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light"
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

function readInitialTheme(): ThemeMode {
  if (typeof document !== "undefined" && isThemeMode(document.documentElement.dataset.theme ?? null)) {
    return document.documentElement.dataset.theme as ThemeMode
  }

  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(stored)) {
      return stored
    }
  }

  return "dark"
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => readInitialTheme())

  useEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  function setTheme(nextTheme: ThemeMode) {
    setThemeState(nextTheme)
  }

  function toggleTheme() {
    setThemeState((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))
  }

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}
