"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarDaysIcon,
  CloudIcon,
  CompassIcon,
  FolderKanbanIcon,
  ListTodoIcon,
  LogOutIcon,
  MenuIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { DataMenu } from "@/components/data-menu"
import { ThemeSelector } from "@/components/theme-selector"
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
  { href: "/", label: "Agenda", icon: CalendarDaysIcon },
  { href: "/attivita", label: "Attività", icon: ListTodoIcon },
  { href: "/progetti", label: "Progetti", icon: FolderKanbanIcon },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { hydrated, readOnly } = useNimbus()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-sm backdrop-blur-md md:flex">
        <Brand />
        <Nav pathname={pathname} />
        <SidebarFooter />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col app-atmosphere">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-foreground/8 bg-background/75 px-4 py-3 backdrop-blur-md md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" />}>
              <MenuIcon />
              <span className="sr-only">Apri menu</span>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-lg"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigazione</SheetTitle>
              </SheetHeader>
              <Brand />
              <Nav pathname={pathname} onNavigate={() => setOpen(false)} />
              <SidebarFooter />
            </SheetContent>
          </Sheet>
          <div className="flex flex-1 items-center gap-2 font-heading text-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-[0_0_0_1px] shadow-primary/20">
              <CloudIcon className="size-4" />
            </span>
            Nimbus
          </div>
          <ThemeSelector side="bottom" className="text-foreground" />
        </header>
        {readOnly ? <DemoBanner /> : null}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
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

function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-primary/20 bg-primary/10 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
      <p className="flex min-w-0 flex-1 items-center gap-2">
        <CompassIcon className="size-4 shrink-0 text-primary" />
        <span>
          Stai esplorando Nimbus con dati di esempio. Le modifiche non vengono
          salvate.
        </span>
      </p>
      <Button
        size="sm"
        nativeButton={false}
        render={<a href="/api/auth/google" />}
      >
        Accedi con Google
      </Button>
    </div>
  )
}

function Brand() {
  return (
    <div className="border-b border-sidebar-border px-5 py-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_24px] shadow-[color:var(--surface-glow)] ring-1 ring-primary/25">
          <CloudIcon className="size-5" />
        </span>
        <div>
          <p className="font-heading text-xl leading-none font-semibold tracking-tight">
            Nimbus
          </p>
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">
            Laviano
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
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/15"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4",
                active ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className="flex-1">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  const router = useRouter()
  const { readOnly } = useNimbus()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (readOnly) return
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
  }, [readOnly])

  async function logout() {
    try {
      await fetch(readOnly ? "/api/demo" : "/api/auth/logout", {
        method: readOnly ? "DELETE" : "POST",
      })
    } catch {
      // Still leave the client session.
    }
    resetClientStore()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="mt-auto space-y-2 border-t border-sidebar-border px-3 py-3">
      <div className="flex items-center justify-between gap-1">
        <p
          className="min-w-0 truncate px-2 text-xs text-muted-foreground"
          title={email ?? undefined}
        >
          {readOnly
            ? "Modalità esplorazione"
            : (email ?? "Dati salvati sul server")}
        </p>
        <div className="flex items-center gap-0.5">
          <ThemeSelector />
          {readOnly ? null : <DataMenu />}
        </div>
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
