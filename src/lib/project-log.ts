import { closedActivity, taskByActivityId, taskDate, taskTime } from "@/lib/tasks"
import type { Activity, Task } from "@/lib/types"

export type ProjectLogEntry = {
  activity: Activity
  task?: Task
  sortKey: string
}

export function projectLogEntries(
  activities: Activity[],
  tasks: Task[],
): ProjectLogEntry[] {
  return activities
    .filter((activity) => closedActivity(activity.status))
    .map((activity) => {
      const task = taskByActivityId(tasks, activity.id)
      return {
        activity,
        task,
        sortKey: task?.startsAt ?? localDateTime(activity.updatedAt),
      }
    })
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
}

/** `updatedAt` is a UTC ISO string; task slots are local `YYYY-MM-DDTHH:mm`. */
function localDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateIT(isoDate: string): string {
  return new Date(
    Number(isoDate.slice(0, 4)),
    Number(isoDate.slice(5, 7)) - 1,
    Number(isoDate.slice(8, 10)),
  ).toLocaleDateString("it-IT")
}

export function formatLogSlot(entry: ProjectLogEntry): string {
  if (!entry.task) return formatDateIT(entry.sortKey.slice(0, 10))
  const dateLabel = formatDateIT(taskDate(entry.task.startsAt))
  const start = taskTime(entry.task.startsAt)
  const end = taskTime(entry.task.endsAt)
  if (start && end) return `${dateLabel} ${start} – ${end}`
  if (start && start !== "12:00") return `${dateLabel} ${start}`
  return dateLabel
}
