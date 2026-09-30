import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { AppShell } from "@/components/app-shell"
import { DEMO_COOKIE } from "@/lib/auth/demo"
import { getSession } from "@/lib/auth/session"
import { StoreProvider } from "@/lib/store"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  const jar = await cookies()
  const demo = !session && jar.get(DEMO_COOKIE)?.value === "1"

  return (
    <StoreProvider mode={demo ? "demo" : "user"}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  )
}
