import { taskDate, taskTime } from "@/lib/tasks"
import type { NimbusStore, Task } from "@/lib/types"

export function formatTaskExportLine(
  projectName: string,
  activityTitle: string,
  task: Task,
): string {
  const start = taskTime(task.startsAt) || "—"
  const end = taskTime(task.endsAt) || "—"
  const project = projectName.trim() || "Senza progetto"
  const title = activityTitle.trim() || "Senza titolo"
  return `${project} - ${title} - ${start} - ${end}`
}

export function tasksOnDate(tasks: Task[], dateISO: string): Task[] {
  return [...tasks]
    .filter((task) => taskDate(task.startsAt) === dateISO)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function formatTasksExportForDay(
  store: NimbusStore,
  dateISO: string,
): string {
  const lines = tasksOnDate(store.tasks, dateISO)
    .map((task) => {
      const activity = store.activities.find(
        (item) => item.id === task.activityId,
      )
      if (!activity) return null
      const project = store.projects.find(
        (item) => item.id === activity.projectId,
      )
      return formatTaskExportLine(
        project?.name ?? "Senza progetto",
        activity.title,
        task,
      )
    })
    .filter((line): line is string => Boolean(line))
  return lines.join("\n")
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
