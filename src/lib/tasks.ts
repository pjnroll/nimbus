import { newId } from "@/lib/people"
import type { Activity, NimbusStore, Task } from "@/lib/types"

export function taskByActivityId(
  tasks: Task[],
  activityId: string,
): Task | undefined {
  return tasks.find((task) => task.activityId === activityId)
}

export function taskDate(startsAt: string): string {
  return startsAt.slice(0, 10)
}

export function taskTime(value: string | null | undefined): string {
  if (!value || value.length < 16) return ""
  return value.slice(11, 16)
}

export function buildStartsAt(date: string, time: string): string {
  const hhmm = time.trim() || "12:00"
  return `${date}T${hhmm}`
}

export function dateToNoonStartsAt(isoDate: string): string {
  return `${isoDate}T12:00`
}

export function formatTaskSlotIT(task: Task): string {
  const date = taskDate(task.startsAt)
  const start = taskTime(task.startsAt)
  const end = taskTime(task.endsAt)
  const dateLabel = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  ).toLocaleDateString("it-IT", { day: "numeric", month: "short" })
  if (start && end) return `${dateLabel} · ${start}–${end}`
  if (start && start !== "12:00") return `${dateLabel} · ${start}`
  return dateLabel
}

export function isTaskOverdue(task: Task, today: string): boolean {
  return taskDate(task.startsAt) < today
}

export function isTaskInRange(
  task: Task,
  from: string | null,
  to: string | null,
): boolean {
  if (!from || !to) return true
  const day = taskDate(task.startsAt)
  return day >= from && day <= to
}

export function closedActivity(status: Activity["status"]): boolean {
  return status === "fatto" || status === "fallita"
}

export function openActivities(activities: Activity[]): Activity[] {
  return activities.filter((activity) => !closedActivity(activity.status))
}

export function upsertTaskInStore(
  store: NimbusStore,
  input: Omit<Task, "id"> & { id?: string },
): { store: NimbusStore; task: Task } {
  const existing = taskByActivityId(store.tasks, input.activityId)
  const task: Task = {
    id: input.id ?? existing?.id ?? newId(),
    activityId: input.activityId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    personIds: [...input.personIds],
    notes: input.notes,
  }
  const without = store.tasks.filter(
    (item) => item.activityId !== input.activityId && item.id !== task.id,
  )
  return {
    store: { ...store, tasks: [task, ...without] },
    task,
  }
}

export function removeTaskFromStore(
  store: NimbusStore,
  activityId: string,
): NimbusStore {
  return {
    ...store,
    tasks: store.tasks.filter((task) => task.activityId !== activityId),
  }
}
