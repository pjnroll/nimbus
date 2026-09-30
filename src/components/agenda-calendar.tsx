"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  addMonthsISO,
  formatMonthYearIT,
  monthGridDays,
  parseISODate,
  startOfMonth,
  todayISO,
} from "@/lib/dates"
import { projectSwatchClass } from "@/lib/project-color"
import { isTaskOverdue, taskTime } from "@/lib/tasks"
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
  month,
  selectedDay,
  today = todayISO(),
  tasksByDay,
  activities,
  projects,
  onMonthChange,
  onSelectDay,
  onOpenActivity,
}: {
  month: string
  selectedDay: string
  today?: string
  tasksByDay: Map<string, Task[]>
  activities: Activity[]
  projects: Project[]
  onMonthChange: (iso: string) => void
  onSelectDay: (iso: string) => void
  onOpenActivity: (activity: Activity) => void
}) {
  const monthStart = startOfMonth(month)
  const days = monthGridDays(monthStart)
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity]),
  )
  const projectById = new Map(projects.map((project) => [project.id, project]))

  function selectDay(iso: string) {
    if (startOfMonth(iso) !== monthStart) onMonthChange(iso)
    onSelectDay(iso)
  }

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Mese precedente"
            onClick={() => onMonthChange(addMonthsISO(-1, monthStart))}
          >
            <ChevronLeftIcon />
          </Button>
          <h2 className="font-heading min-w-40 text-center text-lg font-semibold capitalize">
            {formatMonthYearIT(monthStart)}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Mese successivo"
            onClick={() => onMonthChange(addMonthsISO(1, monthStart))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onMonthChange(today)
            onSelectDay(today)
          }}
        >
          Oggi
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl bg-card/85 shadow-sm ring-1 ring-foreground/8 backdrop-blur-md">
        <div className="grid grid-cols-7 border-b border-border/70 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((label) => (
            <div key={label} className="px-1 py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((iso) => {
            const inMonth = startOfMonth(iso) === monthStart
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
                    const overdue = isTaskOverdue(task, today)
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
                            overdue ? "text-red-700" : "text-foreground",
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
