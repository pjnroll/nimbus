import type { Activity, NimbusStore, Task } from "@/lib/types"
import {
  closedActivity,
  isTaskInRange,
  isTaskOverdue,
  openActivities,
  taskByActivityId,
  taskDate,
} from "@/lib/tasks"
import { todayISO } from "@/lib/dates"

export { openActivities }

export function inboxActivities(activities: Activity[]): Activity[] {
  return activities.filter((activity) => activity.status === "inbox")
}

export function overdueActivities(
  activities: Activity[],
  tasks: Task[],
  today = todayISO(),
): Activity[] {
  return openActivities(activities).filter((activity) => {
    if (activity.status === "inbox") return false
    const task = taskByActivityId(tasks, activity.id)
    return task ? isTaskOverdue(task, today) : false
  })
}

export function dueTodayActivities(
  activities: Activity[],
  tasks: Task[],
  today = todayISO(),
): Activity[] {
  return openActivities(activities).filter((activity) => {
    if (activity.status === "inbox") return false
    const task = taskByActivityId(tasks, activity.id)
    return task ? taskDate(task.startsAt) === today : false
  })
}

export function waitingActivities(activities: Activity[]): Activity[] {
  return activities.filter((activity) => activity.status === "in_attesa")
}

export function activitiesWithTaskInRange(
  activities: Activity[],
  tasks: Task[],
  from: string | null,
  to: string | null,
): Activity[] {
  const byId = new Map(activities.map((activity) => [activity.id, activity]))
  return sortTasksByStartsAt(
    tasks.filter((task) => {
      const activity = byId.get(task.activityId)
      if (!activity || activity.status === "inbox") return false
      return isTaskInRange(task, from, to)
    }),
  )
    .map((task) => byId.get(task.activityId))
    .filter((activity): activity is Activity => Boolean(activity))
}

export function sortTasksByStartsAt(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const byStart = a.startsAt.localeCompare(b.startsAt)
    if (byStart !== 0) return byStart
    return a.activityId.localeCompare(b.activityId)
  })
}

export function homePeriodGroups(
  activities: Activity[],
  tasks: Task[],
  from: string | null,
  to: string | null,
  today = todayISO(),
): {
  tasksInRange: Task[]
  overdue: Activity[]
  withoutTask: Activity[]
  inCorso: Activity[]
  inAttesa: Activity[]
  chiusi: Activity[]
} {
  const overdue = sortByTaskThenPriority(
    overdueActivities(activities, tasks, today),
    tasks,
  )
  const overdueIds = new Set(overdue.map((activity) => activity.id))
  const taskActivityIds = new Set(tasks.map((task) => task.activityId))

  const tasksInRange = sortTasksByStartsAt(
    tasks.filter((task) => {
      const activity = activities.find((item) => item.id === task.activityId)
      if (!activity || activity.status === "inbox") return false
      if (closedActivity(activity.status)) return false
      if (from && to) return isTaskInRange(task, from, to)
      return true
    }),
  )

  const inRangeActivities =
    from && to
      ? activitiesWithTaskInRange(activities, tasks, from, to)
      : activities.filter((activity) => activity.status !== "inbox")

  const withoutTask = sortByTaskThenPriority(
    openActivities(activities).filter(
      (activity) =>
        activity.status !== "inbox" && !taskActivityIds.has(activity.id),
    ),
    tasks,
  )

  return {
    tasksInRange,
    overdue,
    withoutTask,
    inCorso: sortByTaskThenPriority(
      inRangeActivities.filter(
        (activity) =>
          activity.status === "in_corso" && !overdueIds.has(activity.id),
      ),
      tasks,
    ),
    inAttesa: sortByTaskThenPriority(
      inRangeActivities.filter(
        (activity) =>
          activity.status === "in_attesa" && !overdueIds.has(activity.id),
      ),
      tasks,
    ),
    chiusi: sortByTaskThenPriority(
      inRangeActivities.filter(
        (activity) =>
          activity.status === "fatto" || activity.status === "fallita",
      ),
      tasks,
    ),
  }
}

export function projectOpenCount(
  store: NimbusStore,
  projectId: string,
): number {
  return store.activities.filter(
    (activity) =>
      activity.projectId === projectId && !closedActivity(activity.status),
  ).length
}

export function sortByTaskThenPriority(
  activities: Activity[],
  tasks: Task[],
): Activity[] {
  const priorityRank = { alta: 0, media: 1, bassa: 2 }
  return [...activities].sort((a, b) => {
    const taskA = taskByActivityId(tasks, a.id)
    const taskB = taskByActivityId(tasks, b.id)
    const dueA = taskA ? taskDate(taskA.startsAt) : null
    const dueB = taskB ? taskDate(taskB.startsAt) : null
    if (dueA && dueB && dueA !== dueB) return dueA.localeCompare(dueB)
    if (dueA && !dueB) return -1
    if (!dueA && dueB) return 1
    return priorityRank[a.priority] - priorityRank[b.priority]
  })
}

/** @deprecated use sortByTaskThenPriority */
export function sortByDueThenPriority(
  activities: Activity[],
  tasks: Task[] = [],
): Activity[] {
  return sortByTaskThenPriority(activities, tasks)
}
