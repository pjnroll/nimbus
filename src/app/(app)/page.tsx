"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { AgendaCalendar } from "@/components/agenda-calendar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  formatLongDateIT,
  formatRangeIT,
  greetingForNow,
  homeRangeBounds,
  isHomeRange,
  startOfMonth,
  todayISO,
  type HomeRange,
} from "@/lib/dates"
import { sortActivitiesByTaskStartsAt, tasksByDay } from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import {
  copyTextToClipboard,
  formatTasksExportForDay,
} from "@/lib/task-export"
import { taskByActivityId, taskDate } from "@/lib/tasks"
import type { Activity } from "@/lib/types"

const RANGE_TABS: { id: HomeRange; label: string }[] = [
  { id: "mese", label: "Mese" },
  { id: "settimana", label: "Settimana" },
]

function subtitleForRange(range: HomeRange): string {
  const hello = greetingForNow()
  if (range === "mese") {
    return `${hello}. I task pianificati sul mese. Scegli un giorno per vederne i dettagli.`
  }
  return `${hello}. I task della settimana. Scegli un giorno per vederne i dettagli.`
}

export default function AgendaPage() {
  const { store, updateActivity, deleteActivity } = useNimbus()
  const [selected, setSelected] = useState<Activity | null>(null)
  const [creating, setCreating] = useState(false)
  const [range, setRange] = useState<HomeRange>("mese")
  const today = todayISO()
  const [month, setMonth] = useState(today)
  const [week, setWeek] = useState(today)
  const [selectedDay, setSelectedDay] = useState(today)
  const anchor = range === "mese" ? month : week
  const { from, to } = homeRangeBounds(range, anchor)

  const calendarTasks = useMemo(
    () => tasksByDay(store.tasks, store.activities),
    [store.tasks, store.activities],
  )

  const selectedDayActivities = useMemo(() => {
    const dayTasks = calendarTasks.get(selectedDay) ?? []
    const activities = dayTasks
      .map((task) =>
        store.activities.find((activity) => activity.id === task.activityId),
      )
      .filter((activity): activity is Activity => Boolean(activity))
    return sortActivitiesByTaskStartsAt(activities, store.tasks)
  }, [calendarTasks, selectedDay, store.activities, store.tasks])

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

  function selectCalendarDay(iso: string) {
    setSelectedDay(iso)
  }

  function focusToday() {
    setSelectedDay(today)
    setMonth(today)
    setWeek(today)
  }

  async function copyDay(day: string) {
    const text = formatTasksExportForDay(store, day)
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
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Agenda
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {subtitleForRange(range)}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Nuova attività</Button>
      </header>
      <div className="surface-panel flex min-w-0 flex-wrap items-center gap-3 p-3">
        <Tabs
          value={range}
          onValueChange={(next) => {
            if (typeof next !== "string" || !isHomeRange(next)) return
            if (next === "settimana") setWeek(selectedDay)
            setRange(next)
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
        <p className="text-sm font-medium text-muted-foreground capitalize">
          {formatRangeIT(from, to)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <AgendaCalendar
            view={range}
            anchor={anchor}
            selectedDay={selectedDay}
            today={today}
            tasksByDay={calendarTasks}
            activities={store.activities}
            projects={store.projects}
            onAnchorChange={(iso) => {
              if (range === "mese") setMonth(startOfMonth(iso))
              else setWeek(iso)
            }}
            onSelectDay={selectCalendarDay}
            onFocusToday={focusToday}
            onCreateActivity={(iso) => {
              selectCalendarDay(iso)
              setSelected(null)
              setCreating(true)
            }}
            onOpenActivity={(activity) => {
              const task = taskByActivityId(store.tasks, activity.id)
              if (task) selectCalendarDay(taskDate(task.startsAt))
              setSelected(activity)
            }}
          />
          <aside className="min-w-0 space-y-3 lg:sticky lg:top-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight capitalize">
                  {selectedDay === today
                    ? `Oggi · ${formatLongDateIT(selectedDay)}`
                    : formatLongDateIT(selectedDay)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedDayActivities.length === 1
                    ? "1 task"
                    : `${selectedDayActivities.length} task`}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyDay(selectedDay)}
              >
                Copia giornata
              </Button>
            </div>
            <ActivityList
              activities={selectedDayActivities}
              projects={store.projects}
              density="dense"
              showTaskSlot
              defaultExpanded
              compactEmpty
              onOpen={setSelected}
              onStatus={onStatus}
              onDelete={onDelete}
              emptyTitle="Nessun task"
              emptyDescription="Non ci sono esecuzioni pianificate in questo giorno."
            />
          </aside>
      </div>
      <ActivityDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        activity={selected}
      />
      <ActivityDialog
        key={selectedDay}
        open={creating}
        onOpenChange={setCreating}
        heading="Nuova attività"
        defaults={{
          status: "in_corso",
          taskPlanned: true,
          taskDate: selectedDay,
        }}
      />
    </div>
  )
}
