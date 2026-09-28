"use client"

import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react"
import { useTheme, usePalette } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PALETTES, type PaletteId } from "@/lib/palettes"
import { cn } from "@/lib/utils"

export function ThemeSelector({
  align = "end",
  side = "top",
  className,
}: {
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}) {
  const { theme, setTheme } = useTheme()
  const { palette, setPalette } = usePalette()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("shrink-0 text-sidebar-foreground", className)}
          />
        }
      >
        <PaletteIcon className="size-4" />
        <span className="sr-only">Aspetto e palette</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-52">
        <DropdownMenuLabel>Aspetto</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme ?? "system"}
          onValueChange={(value) => {
            if (value === "light" || value === "dark" || value === "system") {
              setTheme(value)
            }
          }}
        >
          <DropdownMenuRadioItem value="light">
            <SunIcon className="size-4" />
            Chiaro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon className="size-4" />
            Scuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon className="size-4" />
            Sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Palette</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={palette}
          onValueChange={(value) => {
            if (
              value === "indigo" ||
              value === "ocean" ||
              value === "forest"
            ) {
              setPalette(value as PaletteId)
            }
          }}
        >
          {PALETTES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              <span
                className={cn("size-3.5 rounded-full ring-1 ring-foreground/20", item.swatchClass)}
                aria-hidden
              />
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
