import { nowISO } from "@/lib/dates"
import { newId } from "@/lib/people"
import type { Category, NimbusStore, Project } from "@/lib/types"

export function cleanCategoryName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim()
}

export function categoryNameKey(raw: string): string {
  return cleanCategoryName(raw).toLocaleLowerCase("it")
}

export function findCategoryByName(
  categories: Category[],
  raw: string,
): Category | undefined {
  const key = categoryNameKey(raw)
  if (!key) return undefined
  return categories.find((category) => categoryNameKey(category.name) === key)
}

export function categoryName(
  project: Project | undefined,
  id: string | null | undefined,
): string {
  if (!project || !id) return ""
  return project.categories.find((category) => category.id === id)?.name ?? ""
}

export function activityCategoryName(
  store: NimbusStore,
  activity: { projectId: string | null; categoryId: string | null },
): string {
  if (!activity.projectId || !activity.categoryId) return ""
  const project = store.projects.find((item) => item.id === activity.projectId)
  return categoryName(project, activity.categoryId)
}

export function resolveActivityCategoryId(
  projects: Project[],
  projectId: string | null,
  categoryId: string | null,
): string | null {
  if (!projectId || !categoryId) return null
  const project = projects.find((item) => item.id === projectId)
  if (!project?.categories.some((category) => category.id === categoryId)) {
    return null
  }
  return categoryId
}

export function upsertCategoryOnProject(
  store: NimbusStore,
  projectId: string,
  raw: string,
): { store: NimbusStore; category: Category | null } {
  const name = cleanCategoryName(raw)
  const project = store.projects.find((item) => item.id === projectId)
  if (!name || !project) return { store, category: null }
  const existing = findCategoryByName(project.categories, name)
  if (existing) return { store, category: existing }
  const category: Category = { id: newId(), name }
  return {
    store: {
      ...store,
      projects: store.projects.map((item) =>
        item.id === projectId
          ? {
              ...item,
              categories: [...item.categories, category],
              updatedAt: nowISO(),
            }
          : item,
      ),
    },
    category,
  }
}
