"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import {
  DEFAULT_PALETTE,
  isPaletteId,
  PALETTE_STORAGE_KEY,
  type PaletteId,
} from "@/lib/palettes"

type PaletteContextValue = {
  palette: PaletteId
  setPalette: (id: PaletteId) => void
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

function applyPaletteAttribute(id: PaletteId) {
  document.documentElement.setAttribute("data-palette", id)
}

function PaletteController({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE)

  useEffect(() => {
    const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY)
    const next = isPaletteId(stored) ? stored : DEFAULT_PALETTE
    setPaletteState(next)
    applyPaletteAttribute(next)
  }, [])

  const setPalette = useCallback((id: PaletteId) => {
    setPaletteState(id)
    applyPaletteAttribute(id)
    window.localStorage.setItem(PALETTE_STORAGE_KEY, id)
  }, [])

  const value = useMemo(
    () => ({ palette, setPalette }),
    [palette, setPalette],
  )

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  )
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="nimbus-theme"
      disableTransitionOnChange
    >
      <PaletteController>{children}</PaletteController>
    </NextThemesProvider>
  )
}

export function usePalette() {
  const ctx = useContext(PaletteContext)
  if (!ctx) {
    throw new Error("usePalette deve essere usato dentro ThemeProvider")
  }
  return ctx
}

export { useTheme }
