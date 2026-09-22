"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  formatLongDateIT,
  formatRangeIT,
  greetingForNow,
  homeRangeBounds,
  isHomeRange,
  todayISO,
  type HomeRange,
} from "@/lib/dates"
import { homePeriodGroups, sortTasksByStartsAt } from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import {
  copyTextToClipboard,
  formatTasksExportForDay,
} from "@/lib/task-export"
import { taskByActivityId, taskDate } from "@/lib/tasks"
import type { Activity } from "@/lib/types"

const RANGE_TABS: { id: HomeRange; label: string }[] = [
  { id: "oggi", label: "Oggi" },
  { id: "settimana", label: "Questa settimana" },
  { id: "sempre", label: "Sempre" },
]

function headingForRange(range: HomeRange): string {
  const hello = greetingForNow()
  switch (range) {
    case "oggi":
      return `${hello}. Agenda di oggi.`
    case "settimana":
      return `${hello}. Agenda della settimana.`
    case "sempre":
      return `${hello}. Tutta l’agenda.`
  }
}

export default function AgendaPage() {
  const { store, updateActivity, deleteActivity } = useNimbus()
  const [selected, setSelected] = useState<Activity | null>(null)
  const [range, setRange] = useState<HomeRange>("settimana")
  const today = todayISO()
  const [exportDate, setExportDate] = useState(today)
  const { from, to } = homeRangeBounds(range, today)

  useEffect(() => {
    if (range === "oggi") setExportDate(today)
  }, [range, today])

  const groups = useMemo(
    () => homePeriodGroups(store.activities, store.tasks, from, to, today),
    [store.activities, store.tasks, from, to, today],
  )
  const tasksActivities = useMemo(() => {
    const ordered = sortTasksByStartsAt(groups.tasksInRange)
    const activities = ordered
      .map((task) =>
        store.activities.find((activity) => activity.id === task.activityId),
      )
      .filter((activity): activity is Activity => Boolean(activity))
    return [...activities].sort((a, b) => {
      const taskA = taskByActivityId(store.tasks, a.id)
      const taskB = taskByActivityId(store.tasks, b.id)
      const startA = taskA?.startsAt ?? ""
      const startB = taskB?.startsAt ?? ""
      const byStart = startA.localeCompare(startB)
      if (byStart !== 0) return byStart
      return a.title.localeCompare(b.title, "it")
    })
  }, [groups.tasksInRange, store.activities, store.tasks])

  const dayGroups = useMemo(() => {
    const byDay = new Map<string, Activity[]>()
    for (const activity of tasksActivities) {
      const task = taskByActivityId(store.tasks, activity.id)
      if (!task) continue
      const day = taskDate(task.startsAt)
      const list = byDay.get(day)
      if (list) list.push(activity)
      else byDay.set(day, [activity])
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, activities]) => ({ day, activities }))
  }, [tasksActivities, store.tasks])

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

  async function copyDay() {
    const text = formatTasksExportForDay(store, exportDate)
    if (!text) {
      toast.message("Nessun task in quella data")
      return
    }
    const ok = await copyTextToClipboard(text)
    if (ok) {
      const lines = text.split("\n").length
      toast.success(
        lines === 1 ? "1 riga copiata" : `${lines} righe copiate`,
      )
    } else {
      toast.error("Impossibile copiare negli appunti")
    }
  }

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
            I task in agenda in questa finestra, in ordine cronologico.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={exportDate}
              onChange={(event) => setExportDate(event.target.value)}
              aria-label="Giorno da esportare"
              className="w-auto"
            />
            <Button type="button" variant="outline" onClick={() => void copyDay()}>
              Copia giornata
            </Button>
          </div>
        </div>
      </header>

      {tasksActivities.length === 0 ? (
        <Alert>
          <AlertTitle>Nessun task in queste date</AlertTitle>
          <AlertDescription>
            Pianifica un’esecuzione dal dialog di un’attività, oppure allarga
            la finestra temporale.
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-sm text-muted-foreground">
          {tasksActivities.length === 1
            ? "1 task in questa finestra"
            : `${tasksActivities.length} task in questa finestra`}
        </p>
      )}

      <div className="space-y-8">
        {dayGroups.map(({ day, activities }) => (
          <section key={day} className="space-y-3">
            <h2 className="font-heading text-lg font-semibold tracking-tight capitalize">
              {day === today ? `Oggi · ${formatLongDateIT(day)}` : formatLongDateIT(day)}
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                {activities.length}
              </span>
            </h2>
            <ActivityList
              activities={activities}
              projects={store.projects}
              density="dense"
              showTaskSlot
              onOpen={setSelected}
              onStatus={onStatus}
              onDelete={onDelete}
              emptyTitle="Nessun task"
              emptyDescription="Non ci sono esecuzioni pianificate in questo giorno."
            />
          </section>
        ))}
      </div>
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
