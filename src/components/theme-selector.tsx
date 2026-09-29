"use client"

import { useEffect } from "react"
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

function debugThemeLog(
  hypothesisId: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  // #region agent log
  fetch("/api/debug-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "b36c36",
      runId: "theme-click-postfix",
      hypothesisId,
      location: "theme-selector.tsx",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
}

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

  useEffect(() => {
    // #region agent log
    debugThemeLog("B", "theme-selector-mounted", {
      theme: theme ?? null,
      palette,
    })
    function onError(event: ErrorEvent) {
      debugThemeLog("A", "window-error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      })
    }
    function onReject(event: PromiseRejectionEvent) {
      debugThemeLog("A", "unhandled-rejection", {
        reason: String(event.reason),
      })
    }
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onReject)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onReject)
    }
    // #endregion
  }, [theme, palette])

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        // #region agent log
        debugThemeLog("C", "menu-open-change", { open })
        // #endregion
      }}
    >
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
        <DropdownMenuRadioGroup
          value={theme ?? "system"}
          onValueChange={(value) => {
            // #region agent log
            debugThemeLog("D", "aspect-change", { value })
            // #endregion
            if (value === "light" || value === "dark" || value === "system") {
              setTheme(value)
            }
          }}
        >
          <DropdownMenuLabel>Aspetto</DropdownMenuLabel>
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
        <DropdownMenuRadioGroup
          value={palette}
          onValueChange={(value) => {
            // #region agent log
            debugThemeLog("D", "palette-change", { value })
            // #endregion
            if (
              value === "indigo" ||
              value === "ocean" ||
              value === "forest"
            ) {
              setPalette(value as PaletteId)
            }
          }}
        >
          <DropdownMenuLabel>Palette</DropdownMenuLabel>
          {PALETTES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              <span
                className={cn(
                  "size-3.5 rounded-full ring-1 ring-foreground/20",
                  item.swatchClass,
                )}
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
