export type ProjectStatus = "attivo" | "in_attesa" | "chiuso"
export type ActivityStatus = "inbox" | "in_corso" | "in_attesa" | "fatto"
export type ActivityType = "eseguo" | "coordino"
export type ActivitySource = "email" | "chat" | "altro"
export type Priority = "alta" | "media" | "bassa"

export type Person = {
  id: string
  name: string
}

export type Category = {
  id: string
  name: string
}

export type Project = {
  id: string
  name: string
  client: string
  status: ProjectStatus
  driveUrl: string
  personIds: string[]
  categories: Category[]
  notes: string
  createdAt: string
  updatedAt: string
}

export type Activity = {
  id: string
  title: string
  description: string
  projectId: string | null
  source: ActivitySource
  requesterId: string | null
  type: ActivityType
  status: ActivityStatus
  priority: Priority
  dueDate: string | null
  assigneeIds: string[]
  waitingOnPersonId: string | null
  waitingReason: string
  closingNote: string
  driveUrl: string
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

export type NimbusStore = {
  version: 3
  people: Person[]
  projects: Project[]
  activities: Activity[]
}

export const STORE_KEY = "nimbus.laviano.v1"
export const NONE_PROJECT = "__none__"
export const NONE_CATEGORY = "__none__"

export function isNimbusStore(value: unknown): value is NimbusStore {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<NimbusStore>
  return (
    candidate.version === 3 &&
    Array.isArray(candidate.people) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.activities)
  )
}

export function isV2NimbusStore(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const candidate = value as {
    version?: unknown
    people?: unknown
    projects?: unknown
    activities?: unknown
  }
  return (
    candidate.version === 2 &&
    Array.isArray(candidate.people) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.activities)
  )
}

export function isLegacyNimbusStore(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const candidate = value as { version?: unknown; projects?: unknown; activities?: unknown }
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.activities)
  )
}
