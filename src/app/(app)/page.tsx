"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  formatRangeIT,
  greetingForNow,
  homeRangeBounds,
  isHomeRange,
  todayISO,
  type HomeRange,
} from "@/lib/dates"
import {
  homePeriodGroups,
  inboxActivities,
  sortByDueThenPriority,
} from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import type { Activity } from "@/lib/types"

const RANGE_TABS: { id: HomeRange; label: string }[] = [
  { id: "oggi", label: "Oggi" },
  { id: "settimana", label: "Questa settimana" },
  { id: "7giorni", label: "Prossimi 7 giorni" },
  { id: "sempre", label: "Sempre" },
]

function headingForRange(range: HomeRange): string {
  const hello = greetingForNow()
  switch (range) {
    case "oggi":
      return `${hello}. Questa è la giornata.`
    case "settimana":
      return `${hello}. Questa è la settimana.`
    case "7giorni":
      return `${hello}. I prossimi sette giorni.`
    case "sempre":
      return `${hello}. Tutto il lavoro.`
  }
}

export default function OggiPage() {
  const { store, updateActivity, deleteActivity } = useNimbus()
  const [selected, setSelected] = useState<Activity | null>(null)
  const [range, setRange] = useState<HomeRange>("settimana")
  const today = todayISO()
  const { from, to } = homeRangeBounds(range, today)

  const groups = useMemo(
    () => homePeriodGroups(store.activities, from, to, today),
    [store.activities, from, to, today],
  )
  const inbox = useMemo(
    () => sortByDueThenPriority(inboxActivities(store.activities)),
    [store.activities],
  )

  function onStatus(
    id: string,
    status: Activity["status"],
    extra?: Partial<Activity>,
  ) {
    updateActivity(id, { status, ...extra })
    toast.success("Stato aggiornato")
  }

  function onDelete(id: string) {
    deleteActivity(id)
    toast.success("Attività eliminata")
  }

  const calm =
    groups.overdue.length === 0 &&
    inbox.length === 0 &&
    groups.inCorso.length === 0 &&
    groups.inAttesa.length === 0

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {formatRangeIT(from, to)}
          </p>
          <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight">
            {headingForRange(range)}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Prima i ritardi, poi ciò che cade in questa finestra: in corso, in
            attesa, fatto. L’inbox resta da smistare a parte.
          </p>
        </div>
        <Tabs
          value={range}
          onValueChange={(next) => {
            if (typeof next === "string" && isHomeRange(next)) setRange(next)
          }}
        >
          <TabsList className="h-auto w-full min-w-0 flex-wrap justify-start sm:w-fit">
            {RANGE_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="In ritardo" value={groups.overdue.length} tone="danger" />
        <Stat label="In corso" value={groups.inCorso.length} tone="info" />
        <Stat label="In attesa" value={groups.inAttesa.length} tone="warn" />
        <Stat label="Fatto" value={groups.fatto.length} tone="ok" />
        <Stat label="Da smistare" value={inbox.length} tone="inbox" />
      </section>

      {calm ? (
        <Alert>
          <AlertTitle>Scrivania in ordine</AlertTitle>
          <AlertDescription>
            Niente in ritardo, niente da smistare e niente aperto in questa
            finestra. Se arriva una mail o una chat, catturala in Inbox.
          </AlertDescription>
        </Alert>
      ) : null}

      <Section
        title="In ritardo"
        hint="Anche se la scadenza è prima di questa finestra: i debiti restano qui."
        activities={groups.overdue}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Nessun ritardo"
        emptyDescription="Le scadenze aperte sono tutte nel futuro, o non hanno data."
      />
      <Section
        title="In corso"
        hint="Aperture con scadenza in questa finestra, senza i ritardi."
        activities={groups.inCorso}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Niente in corso"
        emptyDescription="Non ci sono attività in corso con scadenza in queste date."
      />
      <Section
        title="In attesa"
        hint="Stai coordinando: il blocco è da un’altra parte, ma la data cade qui."
        activities={groups.inAttesa}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Nessuno in attesa"
        emptyDescription="Niente in attesa con scadenza in questa finestra."
      />
      <Section
        title="Fatto"
        hint="Chiuse, con la scadenza in questa finestra."
        activities={groups.fatto}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Niente di chiuso"
        emptyDescription="Le attività fatte con scadenza in queste date compariranno qui."
      />
      <Section
        title="Da smistare"
        hint="Inbox globale: dieci secondi, progetto, tipo, scadenza."
        activities={inbox}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Inbox vuota"
        emptyDescription="Le nuove richieste da email o chat vanno catturate in Inbox."
      />

      <ActivityDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        activity={selected}
      />
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "danger" | "warn" | "info" | "neutral" | "ok" | "inbox"
}) {
  const tones = {
    danger: "bg-red-50 text-red-900 ring-red-100",
    warn: "bg-amber-50 text-amber-950 ring-amber-100",
    info: "bg-blue-50 text-blue-950 ring-blue-100",
    inbox: "bg-cyan-50 text-cyan-950 ring-cyan-100",
    neutral: "bg-card text-foreground ring-foreground/10",
    ok: "bg-green-50 text-green-950 ring-green-100",
  }
  return (
    <div className={`rounded-xl px-4 py-3 ring-1 ${tones[tone]}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  )
}

function Section({
  title,
  hint,
  activities,
  projects,
  onOpen,
  onStatus,
  onDelete,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  hint: string
  activities: Activity[]
  projects: ReturnType<typeof useNimbus>["store"]["projects"]
  onOpen: (activity: Activity) => void
  onStatus: (
    id: string,
    status: Activity["status"],
    extra?: Partial<Activity>,
  ) => void
  onDelete: (id: string) => void
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-xl font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <ActivityList
        activities={activities}
        projects={projects}
        onOpen={onOpen}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </section>
  )
}
