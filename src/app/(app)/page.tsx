"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { AgendaCalendar } from "@/components/agenda-calendar"
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
  startOfMonth,
  todayISO,
  type HomeRange,
} from "@/lib/dates"
import {
  homePeriodGroups,
  sortActivitiesByTaskStartsAt,
  sortTasksByStartsAt,
  tasksByDay,
} from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import {
  copyTextToClipboard,
  formatTasksExportForDay,
} from "@/lib/task-export"
import { taskByActivityId, taskDate } from "@/lib/tasks"
import type { Activity } from "@/lib/types"

const RANGE_TABS: { id: HomeRange; label: string }[] = [
  { id: "mese", label: "Mese" },
  { id: "oggi", label: "Oggi" },
  { id: "settimana", label: "Questa settimana" },
]

function subtitleForRange(range: HomeRange): string {
  const hello = greetingForNow()
  if (range === "mese") {
    return `${hello}. I task pianificati sul mese. Scegli un giorno per vederne i dettagli.`
  }
  return `${hello}. I tuoi impegni nel periodo scelto, giorno per giorno.`
}

export default function AgendaPage() {
  const { store, updateActivity, deleteActivity } = useNimbus()
  const [selected, setSelected] = useState<Activity | null>(null)
  const [creating, setCreating] = useState(false)
  const [range, setRange] = useState<HomeRange>("mese")
  const today = todayISO()
  const [month, setMonth] = useState(today)
  const [selectedDay, setSelectedDay] = useState(today)
  const [exportDate, setExportDate] = useState(today)
  const { from, to } = homeRangeBounds(
    range,
    range === "mese" ? month : today,
  )

  useEffect(() => {
    if (range === "oggi") setExportDate(today)
  }, [range, today])

  const groups = useMemo(
    () => homePeriodGroups(store.activities, store.tasks, from, to, today),
    [store.activities, store.tasks, from, to, today],
  )
  const tasksActivities = useMemo(() => {
    const ordered = sortTasksByStartsAt(groups.tasksInRange, store.activities)
    const activities = ordered
      .map((task) =>
        store.activities.find((activity) => activity.id === task.activityId),
      )
      .filter((activity): activity is Activity => Boolean(activity))
    return sortActivitiesByTaskStartsAt(activities, store.tasks)
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
      .map(([day, activities]) => ({
        day,
        activities: sortActivitiesByTaskStartsAt(activities, store.tasks),
      }))
  }, [tasksActivities, store.tasks])

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

  const focusDay =
    range === "mese"
      ? selectedDay
      : range === "oggi"
        ? today
        : from && to && today >= from && today <= to
          ? today
          : (from ?? today)

  function selectCalendarDay(iso: string) {
    setSelectedDay(iso)
    setExportDate(iso)
  }

  async function copyDay() {
    const day = range === "mese" ? selectedDay : exportDate
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
      <div className="surface-panel flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
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
          <p className="text-sm font-medium text-muted-foreground capitalize">
            {formatRangeIT(from, to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {range === "mese" ? null : (
            <Input
              type="date"
              value={exportDate}
              onChange={(event) => setExportDate(event.target.value)}
              aria-label="Giorno da esportare"
              className="w-auto"
            />
          )}
          <Button type="button" variant="outline" onClick={() => void copyDay()}>
            Copia giornata
          </Button>
        </div>
      </div>

      {range === "mese" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <AgendaCalendar
            month={month}
            selectedDay={selectedDay}
            today={today}
            tasksByDay={calendarTasks}
            activities={store.activities}
            projects={store.projects}
            onMonthChange={(iso) => setMonth(startOfMonth(iso))}
            onSelectDay={selectCalendarDay}
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
      ) : (
        <>
          {tasksActivities.length === 0 ? (
            <Alert>
              <AlertTitle>Nessun impegno in queste date</AlertTitle>
              <AlertDescription>
                Allarga il periodo oppure pianifica un’attività.
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
                  {day === today
                    ? `Oggi · ${formatLongDateIT(day)}`
                    : formatLongDateIT(day)}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">
                    {activities.length}
                  </span>
                </h2>
                <ActivityList
                  activities={activities}
                  projects={store.projects}
                  density="dense"
                  showTaskSlot
                  defaultExpanded
                  onOpen={setSelected}
                  onStatus={onStatus}
                  onDelete={onDelete}
                  emptyTitle="Nessun task"
                  emptyDescription="Non ci sono esecuzioni pianificate in questo giorno."
                />
              </section>
            ))}
          </div>
        </>
      )}
      <ActivityDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        activity={selected}
      />
      <ActivityDialog
        key={focusDay}
        open={creating}
        onOpenChange={setCreating}
        heading="Nuova attività"
        defaults={{
          status: "in_corso",
          taskPlanned: true,
          taskDate: focusDay,
        }}
      />
    </div>
  )
}
