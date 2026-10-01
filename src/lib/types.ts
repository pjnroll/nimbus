import type { ProjectColorId } from "@/lib/project-color"

export type ProjectStatus = "attivo" | "in_attesa" | "chiuso"
export type ActivityStatus =
  | "inbox"
  | "in_corso"
  | "in_attesa"
  | "fatto"
  | "fallita"
export type ActivitySource = "email" | "chat" | "altro"
export type Priority = "alta" | "media" | "bassa"
export type PersonKind = "persona" | "team"

export type { ProjectColorId }

export type Person = {
  id: string
  name: string
  kind: PersonKind
  memberIds: string[]
  archivedAt: string | null
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
  color: ProjectColorId
  driveUrl: string
  managerId: string | null
  participantIds: string[]
  categories: Category[]
  notes: string
  createdAt: string
  updatedAt: string
}

export type ActivityAttachment = {
  id: string
  name: string
  size: number
  mimeType: string
  createdAt: string
}

export type Task = {
  id: string
  activityId: string
  startsAt: string
  endsAt: string | null
  executorIds: string[]
  notes: string
}

export type Activity = {
  id: string
  title: string
  description: string
  projectId: string | null
  source: ActivitySource
  requesterId: string | null
  responsibleId: string | null
  participantIds: string[]
  reminderOn: string | null
  status: ActivityStatus
  priority: Priority
  waitingOnPersonId: string | null
  waitingReason: string
  closingNote: string
  driveUrl: string
  attachments: ActivityAttachment[]
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

export type NimbusStore = {
  version: 6
  people: Person[]
  projects: Project[]
  activities: Activity[]
  tasks: Task[]
}

export const STORE_KEY = "nimbus.laviano.v1"
export const NONE_PROJECT = "__none__"
export const NONE_CATEGORY = "__none__"

function hasStoreCollections(value: object): boolean {
  const candidate = value as {
    people?: unknown
    projects?: unknown
    activities?: unknown
    tasks?: unknown
  }
  return (
    Array.isArray(candidate.people) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.activities) &&
    Array.isArray(candidate.tasks)
  )
}

export function isNimbusStore(value: unknown): value is NimbusStore {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<NimbusStore>
  return candidate.version === 6 && hasStoreCollections(candidate)
}

export function isV5NimbusStore(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const candidate = value as { version?: unknown }
  return candidate.version === 5 && hasStoreCollections(candidate)
}

export function isV4NimbusStore(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const candidate = value as { version?: unknown }
  return candidate.version === 4 && hasStoreCollections(candidate)
}

export function isV3NimbusStore(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const candidate = value as {
    version?: unknown
    people?: unknown
    projects?: unknown
    activities?: unknown
  }
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
