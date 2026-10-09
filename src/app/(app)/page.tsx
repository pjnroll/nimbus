"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ImportMeetDialog } from "@/components/import-meet-dialog"
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
import type { MeetCall } from "@/lib/meet-events"
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

function localTaskSlot(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function startCalendarConsent() {
  const link = document.createElement("a")
  link.href = "/api/calendar/google"
  document.body.append(link)
  link.click()
  link.remove()
}

function meetWindow(): { timeMin: string; timeMax: string } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 15)
  return { timeMin: start.toISOString(), timeMax: end.toISOString() }
}

function subtitleForRange(range: HomeRange): string {
  const hello = greetingForNow()
  if (range === "mese") {
    return `${hello}. I task pianificati sul mese. Scegli un giorno per vederne i dettagli.`
  }
  return `${hello}. I task della settimana. Scegli un giorno per vederne i dettagli.`
}

export default function AgendaPage() {
  const { store, updateActivity, deleteActivity, addActivity, upsertTask, readOnly } =
    useNimbus()
  const [selected, setSelected] = useState<Activity | null>(null)
  const [creating, setCreating] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [meetEvents, setMeetEvents] = useState<MeetCall[]>([])
  const [meetBusy, setMeetBusy] = useState(false)
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

  const openImport = useCallback(async () => {
    if (readOnly) return
    setMeetBusy(true)
    try {
      const { timeMin, timeMax } = meetWindow()
      const response = await fetch(
        `/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
      )
      if (response.status === 401) {
        const body = (await response.json().catch(() => null)) as {
          needsAuth?: boolean
        } | null
        if (body?.needsAuth) {
          startCalendarConsent()
          return
        }
        toast.error("Accedi per importare le call")
        return
      }
      if (!response.ok) {
        toast.error("Non riesco a leggere il Calendario")
        return
      }
      const body = (await response.json()) as { events?: MeetCall[] }
      setMeetEvents(Array.isArray(body.events) ? body.events : [])
      setImportOpen(true)
    } catch {
      toast.error("Non riesco a leggere il Calendario")
    } finally {
      setMeetBusy(false)
    }
  }, [readOnly])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flag = params.get("import")
    if (!flag) return
    params.delete("import")
    const query = params.toString()
    window.history.replaceState(null, "", query ? `/?${query}` : "/")
    if (flag === "denied") {
      toast.message("Accesso al Calendario annullato")
      return
    }
    if (flag === "error") {
      toast.error("Non riesco a collegare il Calendario")
      return
    }
    if (flag !== "meet") return
    const timer = window.setTimeout(() => {
      void openImport()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [openImport])

  function importCalls(calls: MeetCall[]) {
    if (readOnly) return
    let imported = 0
    let earliest = ""
    for (const call of calls) {
      const startsAt = localTaskSlot(call.startsAt)
      if (!startsAt) continue
      const endSlot = call.endsAt ? localTaskSlot(call.endsAt) : null
      const activity = addActivity({
        title: call.title,
        description: call.meetUrl,
        projectId: null,
        source: "altro",
        requesterId: null,
        responsibleId: null,
        participantIds: [],
        reminderOn: null,
        status: "in_corso",
        priority: "media",
        waitingOnPersonId: null,
        waitingReason: "",
        closingNote: "",
        driveUrl: "",
        attachments: [],
        categoryId: null,
        calendarEventId: call.id,
      })
      upsertTask({
        activityId: activity.id,
        startsAt,
        endsAt: endSlot && endSlot > startsAt ? endSlot : null,
        executorIds: [],
        notes: "",
      })
      imported += 1
      if (!earliest || startsAt < earliest) earliest = startsAt
    }
    if (earliest) {
      setSelectedDay(earliest.slice(0, 10))
      setMonth(earliest.slice(0, 10))
      setWeek(earliest.slice(0, 10))
    }
    if (imported > 0) {
      toast.success(
        imported === 1 ? "1 call importata" : `${imported} call importate`,
      )
    }
    setImportOpen(false)
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={readOnly || meetBusy}
            onClick={() => void openImport()}
          >
            Importa call
          </Button>
          <Button onClick={() => setCreating(true)}>Nuova attività</Button>
        </div>
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
      <ImportMeetDialog
        open={importOpen}
        events={meetEvents}
        onOpenChange={setImportOpen}
        onImport={importCalls}
      />
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
