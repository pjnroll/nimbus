"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  addDaysISO,
  addMonthsISO,
  endOfWeekSunday,
  formatMonthYearIT,
  formatRangeIT,
  monthGridDays,
  parseISODate,
  startOfMonth,
  startOfWeekMonday,
  todayISO,
  weekDays,
  type HomeRange,
} from "@/lib/dates"
import { projectSwatchClass } from "@/lib/project-color"
import { closedActivity, isTaskOverdue, taskTime } from "@/lib/tasks"
import type { Activity, Project, Task } from "@/lib/types"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]
const MAX_TITLES = 2

function slotLabel(task: Task): string {
  const start = taskTime(task.startsAt)
  const end = taskTime(task.endsAt)
  if (start && end) return start
  if (start && start !== "12:00") return start
  return ""
}

export function AgendaCalendar({
  view,
  anchor,
  selectedDay,
  today = todayISO(),
  tasksByDay,
  activities,
  projects,
  onAnchorChange,
  onSelectDay,
  onFocusToday,
  onOpenActivity,
  onCreateActivity,
}: {
  view: HomeRange
  anchor: string
  selectedDay: string
  today?: string
  tasksByDay: Map<string, Task[]>
  activities: Activity[]
  projects: Project[]
  onAnchorChange: (iso: string) => void
  onSelectDay: (iso: string) => void
  onFocusToday: () => void
  onOpenActivity: (activity: Activity) => void
  onCreateActivity: (iso: string) => void
}) {
  const week = view === "settimana"
  const monthStart = startOfMonth(anchor)
  const weekStart = startOfWeekMonday(anchor)
  const days = week ? weekDays(anchor) : monthGridDays(monthStart)
  const title = week
    ? formatRangeIT(weekStart, endOfWeekSunday(anchor))
    : formatMonthYearIT(monthStart)
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity]),
  )
  const projectById = new Map(projects.map((project) => [project.id, project]))

  function selectDay(iso: string) {
    if (!week && startOfMonth(iso) !== monthStart) onAnchorChange(iso)
    onSelectDay(iso)
  }

  function shift(direction: -1 | 1) {
    onAnchorChange(
      week
        ? addDaysISO(direction * 7, parseISODate(weekStart))
        : addMonthsISO(direction, monthStart),
    )
  }

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={week ? "Settimana precedente" : "Mese precedente"}
            onClick={() => shift(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <h2 className="font-heading min-w-40 text-center text-lg font-semibold capitalize">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={week ? "Settimana successiva" : "Mese successivo"}
            onClick={() => shift(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onFocusToday}>
          Oggi
        </Button>
      </div>
      <div className="surface overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/70 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((label) => (
            <div key={label} className="px-1 py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((iso) => {
            const inMonth = week || startOfMonth(iso) === monthStart
            const isToday = iso === today
            const isSelected = iso === selectedDay
            const dayTasks = tasksByDay.get(iso) ?? []
            const extra = dayTasks.length - MAX_TITLES
            const dayNumber = parseISODate(iso).getDate()
            return (
              <div
                key={iso}
                className={cn(
                  "relative min-h-24 border-b border-r border-border/50 p-1 last:border-r-0 sm:min-h-28 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0",
                  !inMonth && "bg-muted/20",
                )}
              >
                <button
                  type="button"
                  onClick={() => selectDay(iso)}
                  onDoubleClick={() => {
                    selectDay(iso)
                    onCreateActivity(iso)
                  }}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSelected}
                  aria-label={parseISODate(iso).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                  className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <div
                  className={cn(
                    "pointer-events-none relative z-0 flex size-7 items-center justify-center text-xs font-medium tabular-nums",
                    !inMonth && "text-muted-foreground/70",
                    isToday &&
                      "rounded-full bg-primary text-primary-foreground",
                    isSelected &&
                      !isToday &&
                      "rounded-full bg-muted text-foreground ring-1 ring-foreground/20",
                  )}
                >
                  {dayNumber}
                </div>
                <ul className="relative z-10 mt-1 space-y-0.5">
                  {dayTasks.slice(0, MAX_TITLES).map((task) => {
                    const activity = activityById.get(task.activityId)
                    if (!activity) return null
                    const project = activity.projectId
                      ? projectById.get(activity.projectId)
                      : undefined
                    const overdue =
                      !closedActivity(activity.status) &&
                      isTaskOverdue(task, today)
                    const time = slotLabel(task)
                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onOpenActivity(activity)
                          }}
                          className={cn(
                            "flex w-full min-w-0 items-center gap-1 rounded px-0.5 py-0.5 text-left text-[11px] leading-tight hover:bg-muted/80",
                            closedActivity(activity.status) && "line-through",
                            activity.status === "fatto" && "text-muted-foreground",
                            activity.status === "fallita" && "text-red-700/80",
                            overdue && "text-red-700",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              projectSwatchClass(project),
                            )}
                            aria-hidden
                          />
                          {time ? (
                            <span className="shrink-0 tabular-nums">{time}</span>
                          ) : null}
                          <span className="min-w-0 truncate">{activity.title}</span>
                        </button>
                      </li>
                    )
                  })}
                  {extra > 0 ? (
                    <li className="px-0.5 text-[11px] text-muted-foreground">
                      +{extra}
                    </li>
                  ) : null}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
