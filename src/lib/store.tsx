"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { nowISO } from "@/lib/dates"
import { SEED_STORE } from "@/lib/seed"
import {
  STORE_KEY,
  type Activity,
  type NimbusStore,
  type Project,
} from "@/lib/types"

type StoreContextValue = {
  store: NimbusStore
  hydrated: boolean
  addProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  addActivity: (
    activity: Omit<Activity, "id" | "createdAt" | "updatedAt">,
  ) => Activity
  updateActivity: (id: string, patch: Partial<Activity>) => void
  deleteActivity: (id: string) => void
  replaceStore: (next: NimbusStore) => void
  resetToSeed: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

let memory: NimbusStore | null = null
const listeners = new Set<() => void>()

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isNimbusStore(value: unknown): value is NimbusStore {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<NimbusStore>
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.activities)
  )
}

function readFromStorage(): NimbusStore {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isNimbusStore(parsed)) return parsed
    } else {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(SEED_STORE))
    }
  } catch {
    // Private mode or quota: keep the in-memory seed.
  }
  return SEED_STORE
}

function getSnapshot(): NimbusStore {
  if (memory) return memory
  memory = readFromStorage()
  return memory
}

function getServerSnapshot(): NimbusStore {
  return SEED_STORE
}

function emit() {
  listeners.forEach((listener) => listener())
}

function writeStore(next: NimbusStore) {
  memory = next
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch {
    // Keep working in memory if persistence fails.
  }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emptySubscribe() {
  return () => {}
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

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
    writeStore({
      ...current,
      projects: current.projects.map((project) =>
        project.id === id
          ? { ...project, ...patch, id, updatedAt: nowISO() }
          : project,
      ),
    })
  }, [])

  const deleteProject = useCallback((id: string) => {
    const current = getSnapshot()
    writeStore({
      ...current,
      projects: current.projects.filter((project) => project.id !== id),
      activities: current.activities.map((activity) =>
        activity.projectId === id
          ? { ...activity, projectId: null, updatedAt: nowISO() }
          : activity,
      ),
    })
  }, [])

  const addActivity = useCallback(
    (input: Omit<Activity, "id" | "createdAt" | "updatedAt">) => {
      const stamp = nowISO()
      const activity: Activity = {
        ...input,
        id: newId(),
        createdAt: stamp,
        updatedAt: stamp,
      }
      const current = getSnapshot()
      writeStore({
        ...current,
        activities: [activity, ...current.activities],
      })
      return activity
    },
    [],
  )

  const updateActivity = useCallback((id: string, patch: Partial<Activity>) => {
    const current = getSnapshot()
    writeStore({
      ...current,
      activities: current.activities.map((activity) =>
        activity.id === id
          ? { ...activity, ...patch, id, updatedAt: nowISO() }
          : activity,
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

  const replaceStore = useCallback((next: NimbusStore) => {
    writeStore(next)
  }, [])

  const resetToSeed = useCallback(() => {
    writeStore(SEED_STORE)
  }, [])

  const value = useMemo<StoreContextValue>(
    () => ({
      store,
      hydrated,
      addProject,
      updateProject,
      deleteProject,
      addActivity,
      updateActivity,
      deleteActivity,
      replaceStore,
      resetToSeed,
    }),
    [
      store,
      hydrated,
      addProject,
      updateProject,
      deleteProject,
      addActivity,
      updateActivity,
      deleteActivity,
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
  const parsed: unknown = JSON.parse(raw)
  if (!isNimbusStore(parsed)) {
    throw new Error("File non riconosciuto come backup Nimbus")
  }
  return parsed
}
