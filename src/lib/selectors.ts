import type { Activity, NimbusStore, Task } from "@/lib/types"
import {
  closedActivity,
  isTaskInRange,
  isTaskOverdue,
  openActivities,
  taskByActivityId,
  taskDate,
} from "@/lib/tasks"
import { reminderStartsAt, todayISO } from "@/lib/dates"

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
    activities,
  )
    .map((task) => byId.get(task.activityId))
    .filter((activity): activity is Activity => Boolean(activity))
}

export function sortTasksByStartsAt(
  tasks: Task[],
  activities: Activity[] = [],
): Task[] {
  const titles = new Map(activities.map((activity) => [activity.id, activity.title]))
  return [...tasks].sort((a, b) => {
    const byStart = a.startsAt.localeCompare(b.startsAt)
    if (byStart !== 0) return byStart
    const titleA = titles.get(a.activityId) ?? a.activityId
    const titleB = titles.get(b.activityId) ?? b.activityId
    return titleA.localeCompare(titleB, "it")
  })
}

export function sortActivitiesByTaskStartsAt(
  activities: Activity[],
  tasks: Task[],
): Activity[] {
  return [...activities].sort((a, b) => {
    const taskA = taskByActivityId(tasks, a.id)
    const taskB = taskByActivityId(tasks, b.id)
    const startA = taskA?.startsAt ?? ""
    const startB = taskB?.startsAt ?? ""
    const byStart = startA.localeCompare(startB)
    if (byStart !== 0) return byStart
    return a.title.localeCompare(b.title, "it")
  })
}

function comparePresentAscending(a: string, b: string): number {
  if (a && b && a !== b) return a.localeCompare(b)
  if (a && !b) return -1
  if (!a && b) return 1
  return 0
}

/** Earliest of task start and reminder. A date without a time is 09:00. */
function scheduleAt(activity: Activity, tasks: Task[]): string {
  const taskStart = taskByActivityId(tasks, activity.id)?.startsAt ?? ""
  const reminder = reminderStartsAt(activity.reminderOn) ?? ""
  if (taskStart && reminder) return taskStart < reminder ? taskStart : reminder
  return taskStart || reminder
}

/** Date and time ascending, then priority from alta to bassa. Undated last. */
export function sortActivities(
  activities: Activity[],
  tasks: Task[],
): Activity[] {
  const priorityRank = { alta: 0, media: 1, bassa: 2 }
  return [...activities].sort((a, b) => {
    const byWhen = comparePresentAscending(
      scheduleAt(a, tasks),
      scheduleAt(b, tasks),
    )
    if (byWhen !== 0) return byWhen
    const byPriority = priorityRank[a.priority] - priorityRank[b.priority]
    if (byPriority !== 0) return byPriority
    return a.title.localeCompare(b.title, "it")
  })
}

export function sortActivitiesByDateAscending(
  activities: Activity[],
  tasks: Task[],
): Activity[] {
  return sortActivities(activities, tasks)
}

export function sortActivitiesByScheduleAscending(
  activities: Activity[],
  tasks: Task[],
): Activity[] {
  return sortActivities(activities, tasks)
}

/** Planned tasks grouped by local calendar day (open, fatto, fallita; not inbox). */
export function tasksByDay(
  tasks: Task[],
  activities: Activity[],
): Map<string, Task[]> {
  const byId = new Map(activities.map((activity) => [activity.id, activity]))
  const grouped = new Map<string, Task[]>()
  for (const task of sortTasksByStartsAt(tasks, activities)) {
    const activity = byId.get(task.activityId)
    if (!activity || activity.status === "inbox") continue
    const day = taskDate(task.startsAt)
    const list = grouped.get(day)
    if (list) list.push(task)
    else grouped.set(day, [task])
  }
  return grouped
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
    activities,
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
  return sortActivities(activities, tasks)
}

/** @deprecated use sortByTaskThenPriority */
export function sortByDueThenPriority(
  activities: Activity[],
  tasks: Task[] = [],
): Activity[] {
  return sortByTaskThenPriority(activities, tasks)
}
