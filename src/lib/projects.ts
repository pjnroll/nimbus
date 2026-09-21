import { nowISO } from "@/lib/dates"
import { newId } from "@/lib/people"
import { closedActivity, removeTaskFromStore, taskByActivityId } from "@/lib/tasks"
import type { Activity, NimbusStore, Project, Task } from "@/lib/types"

export function cloneProjectInStore(
  store: NimbusStore,
  projectId: string,
): { store: NimbusStore; project: Project | null } {
  const source = store.projects.find((project) => project.id === projectId)
  if (!source) return { store, project: null }

  const stamp = nowISO()
  const categoryMap = new Map<string, string>()
  const categories = source.categories.map((category) => {
    const id = newId()
    categoryMap.set(category.id, id)
    return { id, name: category.name }
  })

  const project: Project = {
    id: newId(),
    name: `Copia di ${source.name}`,
    client: source.client,
    status: "attivo",
    driveUrl: "",
    personIds: [...source.personIds],
    categories,
    notes: source.notes,
    createdAt: stamp,
    updatedAt: stamp,
  }

  const clonedTasks: Task[] = []
  const clonedActivities: Activity[] = store.activities
    .filter(
      (activity) =>
        activity.projectId === projectId && !closedActivity(activity.status),
    )
    .map((activity) => {
      const nextId = newId()
      const task = taskByActivityId(store.tasks, activity.id)
      if (task) {
        clonedTasks.push({
          ...task,
          id: newId(),
          activityId: nextId,
        })
      }
      return {
        ...activity,
        id: nextId,
        projectId: project.id,
        categoryId: activity.categoryId
          ? (categoryMap.get(activity.categoryId) ?? null)
          : null,
        attachments: [],
        createdAt: stamp,
        updatedAt: stamp,
      }
    })

  return {
    store: {
      ...store,
      projects: [project, ...store.projects],
      activities: [...clonedActivities, ...store.activities],
      tasks: [...clonedTasks, ...store.tasks],
    },
    project,
  }
}

export function deleteActivityFromStore(
  store: NimbusStore,
  activityId: string,
): NimbusStore {
  return removeTaskFromStore(
    {
      ...store,
      activities: store.activities.filter((activity) => activity.id !== activityId),
    },
    activityId,
  )
}
