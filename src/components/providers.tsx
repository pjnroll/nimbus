"use client"

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { StoreProvider } from "@/lib/store"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <StoreProvider>
        {children}
        <Toaster position="bottom-right" richColors />
      </StoreProvider>
    </ThemeProvider>
  )
}
