"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import {
  resolveActivityCategoryId,
  upsertCategoryOnProject,
} from "@/lib/categories"
import { nowISO } from "@/lib/dates"
import {
  activityPersonIds,
  coerceNimbusStore,
  linkPeopleToProject,
  newId,
  upsertPersonInStore,
} from "@/lib/people"
import { cloneProjectInStore } from "@/lib/projects"
import { SEED_STORE } from "@/lib/seed"
import {
  STORE_KEY,
  type Activity,
  type Category,
  type NimbusStore,
  type Person,
  type Project,
} from "@/lib/types"

type StoreContextValue = {
  store: NimbusStore
  hydrated: boolean
  addProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  cloneProject: (id: string) => Project | null
  addActivity: (
    activity: Omit<Activity, "id" | "createdAt" | "updatedAt">,
  ) => Activity
  updateActivity: (id: string, patch: Partial<Activity>) => void
  deleteActivity: (id: string) => void
  upsertPerson: (name: string) => Person | null
  upsertCategory: (projectId: string, name: string) => Category | null
  replaceStore: (next: NimbusStore) => void
  resetToSeed: () => void
}

const EMPTY_STORE: NimbusStore = {
  version: 3,
  people: [],
  projects: [],
  activities: [],
}

const StoreContext = createContext<StoreContextValue | null>(null)

let memory: NimbusStore = EMPTY_STORE
let hydrated = false
let dirty = false
let hydratePromise: Promise<void> | null = null
let persistChain: Promise<void> = Promise.resolve()

const listeners = new Set<() => void>()
const hydratedListeners = new Set<() => void>()

export function resetClientStore() {
  memory = EMPTY_STORE
  hydrated = false
  dirty = false
  hydratePromise = null
  persistChain = Promise.resolve()
  emit()
  emitHydrated()
}

function emit() {
  listeners.forEach((listener) => listener())
}

function emitHydrated() {
  hydratedListeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function subscribeHydrated(listener: () => void) {
  hydratedListeners.add(listener)
  return () => hydratedListeners.delete(listener)
}

function getSnapshot(): NimbusStore {
  return memory
}

function getServerSnapshot(): NimbusStore {
  return EMPTY_STORE
}

function getHydratedSnapshot(): boolean {
  return hydrated
}

function getServerHydratedSnapshot(): boolean {
  return false
}

function readLegacyLocalStore(): NimbusStore | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return null
    return coerceNimbusStore(JSON.parse(raw))?.store ?? null
  } catch {
    return null
  }
}

function clearLegacyLocalStore() {
  try {
    window.localStorage.removeItem(STORE_KEY)
  } catch {
    // Private mode: nothing to clear.
  }
}

async function putStore(next: NimbusStore): Promise<void> {
  const response = await fetch("/api/store", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  })
  if (response.status === 401) {
    resetClientStore()
    window.location.assign(new URL("/login", window.location.origin).href)
    throw new Error("save-failed")
  }
  if (!response.ok) {
    throw new Error("save-failed")
  }
}

function persist(next: NimbusStore) {
  persistChain = persistChain
    .then(() => putStore(next))
    .catch(() => {
      toast.error("Non riesco a salvare i dati sul server.")
    })
}

function writeStore(next: NimbusStore) {
  dirty = true
  memory = next
  emit()
  persist(next)
}

function parseStoreResponse(value: unknown): {
  store: NimbusStore
  created: boolean
} | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as { store?: unknown; created?: unknown }
  const coerced = coerceNimbusStore(candidate.store)
  if (!coerced) return null
  return {
    store: coerced.store,
    created: candidate.created === true,
  }
}

async function hydrateFromServer(): Promise<void> {
  try {
    const response = await fetch("/api/store", { cache: "no-store" })
    if (response.status === 401) {
      resetClientStore()
      window.location.assign(new URL("/login", window.location.origin).href)
      return
    }
    if (!response.ok) {
      throw new Error("load-failed")
    }
    const parsed = parseStoreResponse(await response.json())
    if (!parsed) {
      throw new Error("load-failed")
    }

    if (!dirty) {
      let next = parsed.store
      if (parsed.created) {
        const legacy = readLegacyLocalStore()
        if (legacy) {
          next = legacy
          try {
            await putStore(legacy)
            clearLegacyLocalStore()
          } catch {
            toast.error("Non riesco a salvare i dati sul server.")
          }
        }
      }
      memory = next
      emit()
    } else {
      persist(memory)
    }
  } catch {
    if (!dirty) {
      memory = readLegacyLocalStore() ?? SEED_STORE
      emit()
    }
    toast.error("Non riesco a caricare i dati dal server.")
  } finally {
    hydrated = true
    emitHydrated()
  }
}

function ensureHydrated() {
  if (!hydratePromise) {
    hydratePromise = hydrateFromServer()
  }
  return hydratePromise
}

function withActivityPeople(
  store: NimbusStore,
  activity: Pick<
    Activity,
    "projectId" | "assigneeIds" | "requesterId" | "waitingOnPersonId"
  >,
): NimbusStore {
  return linkPeopleToProject(store, activity.projectId, activityPersonIds(activity))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const isHydrated = useSyncExternalStore(
    subscribeHydrated,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  )

  useEffect(() => {
    void ensureHydrated()
  }, [])

  const addProject = useCallback(
    (input: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
      const stamp = nowISO()
      const project: Project = {
        ...input,
        id: newId(),
        createdAt: stamp,
        updatedAt: stamp,
      }
      const current = getSnapshot()
      writeStore({
        ...current,
        projects: [project, ...current.projects],
      })
      return project
    },
    [],
  )

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    const current = getSnapshot()
    const categories = patch.categories
    writeStore({
      ...current,
      projects: current.projects.map((project) =>
        project.id === id
          ? { ...project, ...patch, id, updatedAt: nowISO() }
          : project,
      ),
      activities:
        categories === undefined
          ? current.activities
          : current.activities.map((activity) => {
              if (activity.projectId !== id || !activity.categoryId) return activity
              const stillThere = categories.some(
                (category) => category.id === activity.categoryId,
              )
              if (stillThere) return activity
              return { ...activity, categoryId: null, updatedAt: nowISO() }
            }),
    })
  }, [])

  const cloneProject = useCallback((id: string) => {
    const result = cloneProjectInStore(getSnapshot(), id)
    if (!result.project) return null
    writeStore(result.store)
    return result.project
  }, [])

  const deleteProject = useCallback((id: string) => {
    const current = getSnapshot()
    writeStore({
      ...current,
      projects: current.projects.filter((project) => project.id !== id),
      activities: current.activities.map((activity) =>
        activity.projectId === id
          ? { ...activity, projectId: null, categoryId: null, updatedAt: nowISO() }
          : activity,
      ),
    })
  }, [])

  const addActivity = useCallback(
    (input: Omit<Activity, "id" | "createdAt" | "updatedAt">) => {
      const stamp = nowISO()
      const current = getSnapshot()
      const activity: Activity = {
        ...input,
        id: newId(),
        createdAt: stamp,
        updatedAt: stamp,
        categoryId: resolveActivityCategoryId(
          current.projects,
          input.projectId,
          input.categoryId,
        ),
      }
      const linked = withActivityPeople(current, activity)
      writeStore({
        ...linked,
        activities: [activity, ...linked.activities],
      })
      return activity
    },
    [],
  )

  const updateActivity = useCallback((id: string, patch: Partial<Activity>) => {
    const current = getSnapshot()
    const previous = current.activities.find((activity) => activity.id === id)
    if (!previous) return
    const nextActivity: Activity = {
      ...previous,
      ...patch,
      id,
      updatedAt: nowISO(),
      categoryId: resolveActivityCategoryId(
        current.projects,
        patch.projectId === undefined ? previous.projectId : patch.projectId,
        patch.categoryId === undefined ? previous.categoryId : patch.categoryId,
      ),
    }
    const linked = withActivityPeople(current, nextActivity)
    writeStore({
      ...linked,
      activities: linked.activities.map((activity) =>
        activity.id === id ? nextActivity : activity,
      ),
    })
  }, [])

  const deleteActivity = useCallback((id: string) => {
    const current = getSnapshot()
    writeStore({
      ...current,
      activities: current.activities.filter((activity) => activity.id !== id),
    })
  }, [])

  const upsertPerson = useCallback((name: string) => {
    const result = upsertPersonInStore(getSnapshot(), name)
    if (result.person && result.store !== getSnapshot()) {
      writeStore(result.store)
    }
    return result.person
  }, [])

  const upsertCategory = useCallback((projectId: string, name: string) => {
    const result = upsertCategoryOnProject(getSnapshot(), projectId, name)
    if (result.category && result.store !== getSnapshot()) {
      writeStore(result.store)
    }
    return result.category
  }, [])

  const replaceStore = useCallback((next: NimbusStore) => {
    writeStore(next)
  }, [])

  const resetToSeed = useCallback(() => {
    writeStore(SEED_STORE)
  }, [])

  const value = useMemo<StoreContextValue>(
    () => ({
      store,
      hydrated: isHydrated,
      addProject,
      updateProject,
      deleteProject,
      cloneProject,
      addActivity,
      updateActivity,
      deleteActivity,
      upsertPerson,
      upsertCategory,
      replaceStore,
      resetToSeed,
    }),
    [
      store,
      isHydrated,
      addProject,
      updateProject,
      deleteProject,
      cloneProject,
      addActivity,
      updateActivity,
      deleteActivity,
      upsertPerson,
      upsertCategory,
      replaceStore,
      resetToSeed,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useNimbus() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error("useNimbus deve essere usato dentro StoreProvider")
  }
  return context
}

export function parseImportedStore(raw: string): NimbusStore {
  const coerced = coerceNimbusStore(JSON.parse(raw))
  if (!coerced) {
    throw new Error("File non riconosciuto come backup Nimbus")
  }
  return coerced.store
}
