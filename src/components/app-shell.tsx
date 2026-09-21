"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarDaysIcon,
  CloudIcon,
  FolderKanbanIcon,
  ListTodoIcon,
  LogOutIcon,
  MenuIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { DataMenu } from "@/components/data-menu"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { resetClientStore, useNimbus } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Oggi", icon: CalendarDaysIcon },
  { href: "/attivita", label: "Attività", icon: ListTodoIcon },
  { href: "/progetti", label: "Progetti", icon: FolderKanbanIcon },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { hydrated } = useNimbus()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-full bg-background">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm md:flex">
        <Brand />
        <Nav pathname={pathname} />
        <SidebarFooter />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon-sm" />}>
              <MenuIcon />
              <span className="sr-only">Apri menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground shadow-sm">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigazione</SheetTitle>
              </SheetHeader>
              <Brand />
              <Nav pathname={pathname} onNavigate={() => setOpen(false)} />
              <SidebarFooter />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 font-heading text-lg font-medium">
            <CloudIcon className="size-5 text-primary" />
            Nimbus
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {hydrated ? (
            children
          ) : (
            <p className="text-sm text-muted-foreground">
              Caricamento della scrivania…
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="border-b border-sidebar-border px-5 py-5">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CloudIcon className="size-5" />
        </span>
        <div>
          <p className="font-heading text-lg leading-none font-semibold tracking-tight">
            Nimbus
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Laviano · Cloud PM
          </p>
        </div>
      </div>
    </div>
  )
}

function Nav({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-muted hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (
          payload &&
          typeof payload === "object" &&
          "email" in payload &&
          typeof payload.email === "string"
        ) {
          setEmail(payload.email)
        }
      })
      .catch(() => undefined)
  }, [])

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Still leave the client session.
    }
    resetClientStore()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="mt-auto space-y-2 border-t border-sidebar-border px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate px-2 text-xs text-muted-foreground" title={email ?? undefined}>
          {email ?? "Dati salvati sul server"}
        </p>
        <DataMenu />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        onClick={() => void logout()}
      >
        <LogOutIcon />
        Esci
      </Button>
    </div>
  )
}
