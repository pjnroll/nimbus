import type { Activity, NimbusStore } from "@/lib/types"
import { isDueToday, isOverdue, todayISO } from "@/lib/dates"

export function openActivities(activities: Activity[]): Activity[] {
  return activities.filter((activity) => activity.status !== "fatto")
}

export function inboxActivities(activities: Activity[]): Activity[] {
  return activities.filter((activity) => activity.status === "inbox")
}

export function overdueActivities(
  activities: Activity[],
  today = todayISO(),
): Activity[] {
  return openActivities(activities).filter(
    (activity) =>
      activity.status !== "inbox" && isOverdue(activity.dueDate, today),
  )
}

export function dueTodayActivities(
  activities: Activity[],
  today = todayISO(),
): Activity[] {
  return openActivities(activities).filter(
    (activity) =>
      activity.status !== "inbox" && isDueToday(activity.dueDate, today),
  )
}

export function waitingActivities(activities: Activity[]): Activity[] {
  return activities.filter((activity) => activity.status === "in_attesa")
}

export function dueInRange(
  activities: Activity[],
  from: string,
  to: string,
): Activity[] {
  return activities.filter((activity) => {
    const due = activity.dueDate
    return due !== null && due >= from && due <= to
  })
}

export function homePeriodGroups(
  activities: Activity[],
  from: string,
  to: string,
  today = todayISO(),
): {
  overdue: Activity[]
  inCorso: Activity[]
  inAttesa: Activity[]
  fatto: Activity[]
} {
  const overdue = sortByDueThenPriority(overdueActivities(activities, today))
  const overdueIds = new Set(overdue.map((activity) => activity.id))
  const inRange = dueInRange(activities, from, to)

  return {
    overdue,
    inCorso: sortByDueThenPriority(
      inRange.filter(
        (activity) =>
          activity.status === "in_corso" && !overdueIds.has(activity.id),
      ),
    ),
    inAttesa: sortByDueThenPriority(
      inRange.filter(
        (activity) =>
          activity.status === "in_attesa" && !overdueIds.has(activity.id),
      ),
    ),
    fatto: sortByDueThenPriority(
      inRange.filter((activity) => activity.status === "fatto"),
    ),
  }
}

export function projectOpenCount(
  store: NimbusStore,
  projectId: string,
): number {
  return store.activities.filter(
    (activity) =>
      activity.projectId === projectId && activity.status !== "fatto",
  ).length
}

export function sortByDueThenPriority(activities: Activity[]): Activity[] {
  const priorityRank = { alta: 0, media: 1, bassa: 2 }
  return [...activities].sort((a, b) => {
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate)
    }
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    return priorityRank[a.priority] - priorityRank[b.priority]
  })
}
