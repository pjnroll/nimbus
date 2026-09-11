export type ProjectStatus = "attivo" | "in_attesa" | "chiuso"
export type ActivityStatus = "inbox" | "in_corso" | "in_attesa" | "fatto"
export type ActivityType = "eseguo" | "coordino"
export type ActivitySource = "email" | "chat" | "altro"
export type Priority = "alta" | "media" | "bassa"

export type Project = {
  id: string
  name: string
  client: string
  status: ProjectStatus
  driveUrl: string
  people: string
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
  requester: string
  type: ActivityType
  status: ActivityStatus
  priority: Priority
  dueDate: string | null
  waitingOn: string
  waitingReason: string
  driveUrl: string
  createdAt: string
  updatedAt: string
}

export type NimbusStore = {
  version: 1
  projects: Project[]
  activities: Activity[]
}

export const STORE_KEY = "nimbus.laviano.v1"
export const NONE_PROJECT = "__none__"

export function isNimbusStore(value: unknown): value is NimbusStore {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<NimbusStore>
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.activities)
  )
}
