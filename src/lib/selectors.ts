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
