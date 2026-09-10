"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { greetingForNow, formatLongDateIT, todayISO } from "@/lib/dates"
import {
  dueTodayActivities,
  inboxActivities,
  overdueActivities,
  sortByDueThenPriority,
  waitingActivities,
} from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import type { Activity } from "@/lib/types"

export default function OggiPage() {
  const { store, updateActivity, deleteActivity } = useNimbus()
  const [selected, setSelected] = useState<Activity | null>(null)
  const today = todayISO()

  const overdue = useMemo(
    () => sortByDueThenPriority(overdueActivities(store.activities, today)),
    [store.activities, today],
  )
  const dueToday = useMemo(
    () => sortByDueThenPriority(dueTodayActivities(store.activities, today)),
    [store.activities, today],
  )
  const inbox = useMemo(
    () => inboxActivities(store.activities),
    [store.activities],
  )
  const waiting = useMemo(
    () => sortByDueThenPriority(waitingActivities(store.activities)),
    [store.activities],
  )

  function onStatus(id: string, status: Activity["status"]) {
    updateActivity(id, { status })
    toast.success("Stato aggiornato")
  }

  function onDelete(id: string) {
    deleteActivity(id)
    toast.success("Attività eliminata")
  }

  const calm =
    overdue.length === 0 && inbox.length === 0 && dueToday.length === 0

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground capitalize">
          {formatLongDateIT(today)}
        </p>
        <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight">
          {greetingForNow()}. Questa è la giornata.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Non è un foglio: prima i ritardi, poi ciò che scade oggi, poi le
          richieste da smistare e le persone da sollecitare.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="In ritardo" value={overdue.length} tone="danger" />
        <Stat label="Scadono oggi" value={dueToday.length} tone="warn" />
        <Stat label="Da smistare" value={inbox.length} tone="info" />
        <Stat label="In attesa di altri" value={waiting.length} tone="neutral" />
      </section>

      {calm ? (
        <Alert>
          <AlertTitle>Scrivania in ordine</AlertTitle>
          <AlertDescription>
            Niente in ritardo e niente da smistare. Se arriva una mail o una
            chat, catturala in Inbox invece di aprirla in un’altra riga del
            foglio.
          </AlertDescription>
        </Alert>
      ) : null}

      <Section
        title="In ritardo"
        hint="Chiudi queste prima di tutto il resto."
        activities={overdue}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Nessun ritardo"
        emptyDescription="Le scadenze aperte sono tutte nel futuro, o non hanno data."
      />
      <Section
        title="Scadono oggi"
        hint="Il lavoro della giornata, senza le altre colonne."
        activities={dueToday}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Niente in scadenza oggi"
        emptyDescription="Se serve una data, aprila e impostala: altrimenti resta invisibile qui."
      />
      <Section
        title="Inbox da smistare"
        hint="Dieci secondi: progetto, tipo, scadenza."
        activities={inbox}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Inbox vuota"
        emptyDescription="Le nuove richieste da email o chat vanno catturate in Inbox."
      />
      <Section
        title="Da sollecitare"
        hint="Attività che stai coordinando: il blocco è da un’altra parte."
        activities={waiting}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={onStatus}
        onDelete={onDelete}
        emptyTitle="Nessuno in attesa"
        emptyDescription="Quando coordini, metti lo stato In attesa e indica di chi stai aspettando."
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
  tone: "danger" | "warn" | "info" | "neutral"
}) {
  const tones = {
    danger: "bg-red-50 text-red-900 ring-red-100",
    warn: "bg-amber-50 text-amber-950 ring-amber-100",
    info: "bg-sky-50 text-sky-950 ring-sky-100",
    neutral: "bg-card text-foreground ring-foreground/10",
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
  onStatus: (id: string, status: Activity["status"]) => void
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
