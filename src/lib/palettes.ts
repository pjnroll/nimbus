export const PALETTE_IDS = ["indigo", "ocean", "forest"] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

export const DEFAULT_PALETTE: PaletteId = "indigo"
export const PALETTE_STORAGE_KEY = "nimbus-palette"

export const PALETTES: {
  id: PaletteId
  label: string
  swatchClass: string
}[] = [
  {
    id: "indigo",
    label: "Indigo",
    swatchClass: "bg-[oklch(0.54_0.15_262)]",
  },
  {
    id: "ocean",
    label: "Oceano",
    swatchClass: "bg-[oklch(0.52_0.1_210)]",
  },
  {
    id: "forest",
    label: "Foresta",
    swatchClass: "bg-[oklch(0.48_0.11_155)]",
  },
]

export function isPaletteId(value: string | null | undefined): value is PaletteId {
  return (
    value === "indigo" || value === "ocean" || value === "forest"
  )
}
