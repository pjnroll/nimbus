import type { ReactNode } from "react"
import { AppShell } from "@/components/app-shell"
import { StoreProvider } from "@/lib/store"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  )
}
