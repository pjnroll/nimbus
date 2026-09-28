import type { ReactNode } from "react"
import { ThemeSelector } from "@/components/theme-selector"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-atmosphere relative flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4 z-10">
        <ThemeSelector side="bottom" className="text-foreground" />
      </div>
      {children}
    </div>
  )
}
