"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDaysIcon,
  CloudIcon,
  FolderKanbanIcon,
  InboxIcon,
  ListTodoIcon,
  MenuIcon,
} from "lucide-react"
import { useState } from "react"
import { DataMenu } from "@/components/data-menu"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { inboxActivities } from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Oggi", icon: CalendarDaysIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/attivita", label: "Attività", icon: ListTodoIcon },
  { href: "/progetti", label: "Progetti", icon: FolderKanbanIcon },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { store, hydrated } = useNimbus()
  const [open, setOpen] = useState(false)
  const inboxCount = inboxActivities(store.activities).length

  return (
    <div className="flex min-h-full bg-background">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Brand />
        <Nav
          pathname={pathname}
          inboxCount={inboxCount}
          hydrated={hydrated}
        />
        <SidebarFooter />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon-sm" />}>
              <MenuIcon />
              <span className="sr-only">Apri menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigazione</SheetTitle>
              </SheetHeader>
              <Brand />
              <Nav
                pathname={pathname}
                inboxCount={inboxCount}
                hydrated={hydrated}
                onNavigate={() => setOpen(false)}
              />
              <SidebarFooter />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 font-heading text-lg font-medium">
            <CloudIcon className="size-5 text-sky-700" />
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
    <div className="border-b border-white/10 px-5 py-5">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-sky-500/20 text-sky-200">
          <CloudIcon className="size-5" />
        </span>
        <div>
          <p className="font-heading text-lg leading-none font-semibold tracking-tight">
            Nimbus
          </p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">
            Laviano · Cloud PM
          </p>
        </div>
      </div>
    </div>
  )
}

function Nav({
  pathname,
  inboxCount,
  hydrated,
  onNavigate,
}: {
  pathname: string
  inboxCount: number
  hydrated: boolean
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
                : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            {item.href === "/inbox" && hydrated && inboxCount > 0 ? (
              <span className="rounded-full bg-sky-400/20 px-1.5 text-xs text-sky-100">
                {inboxCount}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-white/10 px-3 py-3">
      <p className="px-2 text-xs text-sidebar-foreground/60">Dati solo su questo browser</p>
      <DataMenu />
    </div>
  )
}
