import { nowISO } from "@/lib/dates"
import { coerceProjectColor } from "@/lib/project-color"
import {
  isLegacyNimbusStore,
  isNimbusStore,
  isV2NimbusStore,
  isV3NimbusStore,
  type Activity,
  type NimbusStore,
  type Person,
  type Project,
  type Task,
} from "@/lib/types"

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function cleanPersonName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function personNameKey(raw: string): string {
  return cleanPersonName(raw).toLocaleLowerCase("it")
}

export function splitPeopleList(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => cleanPersonName(part))
    .filter(Boolean)
}

export function findPersonByName(
  people: Person[],
  raw: string,
): Person | undefined {
  const key = personNameKey(raw)
  if (!key) return undefined
  return people.find((person) => personNameKey(person.name) === key)
}

export function personById(
  people: Person[],
  id: string | null | undefined,
): Person | undefined {
  if (!id) return undefined
  return people.find((person) => person.id === id)
}

export function personName(
  people: Person[],
  id: string | null | undefined,
): string {
  return personById(people, id)?.name ?? ""
}

export function personNames(people: Person[], ids: string[]): string {
  return ids
    .map((id) => personName(people, id))
    .filter(Boolean)
    .join(", ")
}

export function activityPersonIds(
  activity: Pick<Activity, "requesterId" | "waitingOnPersonId">,
  task?: Pick<Task, "personIds"> | null,
): string[] {
  const ids = [
    ...(task?.personIds ?? []),
    activity.requesterId,
    activity.waitingOnPersonId,
  ]
  return ids.filter((id): id is string => Boolean(id))
}

export function activityPersonHaystack(
  people: Person[],
  activity: Pick<Activity, "requesterId" | "waitingOnPersonId">,
  task?: Pick<Task, "personIds"> | null,
): string {
  return personNames(people, activityPersonIds(activity, task))
}

export function upsertPersonInStore(
  store: NimbusStore,
  raw: string,
): { store: NimbusStore; person: Person | null } {
  const name = cleanPersonName(raw)
  if (!name) return { store, person: null }
  const existing = findPersonByName(store.people, name)
  if (existing) return { store, person: existing }
  const person: Person = { id: newId(), name }
  return {
    store: { ...store, people: [...store.people, person] },
    person,
  }
}

export function ensurePersonOnProject(
  store: NimbusStore,
  projectId: string,
  personId: string,
): NimbusStore {
  const project = store.projects.find((item) => item.id === projectId)
  if (!project || project.personIds.includes(personId)) return store
  return {
    ...store,
    projects: store.projects.map((item) =>
      item.id === projectId
        ? { ...item, personIds: [...item.personIds, personId], updatedAt: nowISO() }
        : item,
    ),
  }
}

export function linkPeopleToProject(
  store: NimbusStore,
  projectId: string | null,
  personIds: string[],
): NimbusStore {
  if (!projectId) return store
  return personIds.reduce(
    (current, personId) =>
      personId ? ensurePersonOnProject(current, projectId, personId) : current,
    store,
  )
}

function upsertFromName(
  people: Person[],
  byKey: Map<string, Person>,
  raw: string,
): string | null {
  const name = cleanPersonName(raw)
  if (!name) return null
  const key = personNameKey(name)
  const existing = byKey.get(key)
  if (existing) return existing.id
  const person: Person = { id: newId(), name }
  people.push(person)
  byKey.set(key, person)
  return person.id
}

function coerceAttachments(value: unknown): Activity["attachments"] {
  if (!Array.isArray(value)) return []
  const attachments: Activity["attachments"] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const candidate = item as {
      id?: unknown
      name?: unknown
      size?: unknown
      mimeType?: unknown
      createdAt?: unknown
    }
    if (typeof candidate.id !== "string" || !candidate.id) continue
    if (typeof candidate.name !== "string" || !candidate.name) continue
    if (typeof candidate.size !== "number" || !Number.isFinite(candidate.size)) {
      continue
    }
    if (typeof candidate.createdAt !== "string") continue
    attachments.push({
      id: candidate.id,
      name: candidate.name,
      size: candidate.size,
      mimeType:
        typeof candidate.mimeType === "string" && candidate.mimeType
          ? candidate.mimeType
          : "application/octet-stream",
      createdAt: candidate.createdAt,
    })
  }
  return attachments
}

function coerceTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return []
  const tasks: Task[] = []
  const seenActivity = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const candidate = item as Partial<Task>
    if (typeof candidate.id !== "string" || !candidate.id) continue
    if (typeof candidate.activityId !== "string" || !candidate.activityId) continue
    if (typeof candidate.startsAt !== "string" || !candidate.startsAt) continue
    if (seenActivity.has(candidate.activityId)) continue
    seenActivity.add(candidate.activityId)
    tasks.push({
      id: candidate.id,
      activityId: candidate.activityId,
      startsAt: candidate.startsAt,
      endsAt:
        typeof candidate.endsAt === "string" && candidate.endsAt
          ? candidate.endsAt
          : null,
      personIds: Array.isArray(candidate.personIds)
        ? candidate.personIds.filter((id): id is string => typeof id === "string")
        : [],
      notes: typeof candidate.notes === "string" ? candidate.notes : "",
    })
  }
  return tasks
}

function normalizeActivity(raw: Record<string, unknown>): Activity {
  return {
    id: String(raw.id ?? ""),
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : "",
    projectId: typeof raw.projectId === "string" ? raw.projectId : null,
    source:
      raw.source === "email" || raw.source === "chat" || raw.source === "altro"
        ? raw.source
        : "altro",
    requesterId: typeof raw.requesterId === "string" ? raw.requesterId : null,
    type: raw.type === "coordino" ? "coordino" : "eseguo",
    status:
      raw.status === "inbox" ||
      raw.status === "in_corso" ||
      raw.status === "in_attesa" ||
      raw.status === "fatto" ||
      raw.status === "fallita"
        ? raw.status
        : "inbox",
    priority:
      raw.priority === "alta" || raw.priority === "bassa" ? raw.priority : "media",
    waitingOnPersonId:
      typeof raw.waitingOnPersonId === "string" ? raw.waitingOnPersonId : null,
    waitingReason: typeof raw.waitingReason === "string" ? raw.waitingReason : "",
    closingNote: typeof raw.closingNote === "string" ? raw.closingNote : "",
    driveUrl: typeof raw.driveUrl === "string" ? raw.driveUrl : "",
    attachments: coerceAttachments(raw.attachments),
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowISO(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowISO(),
  }
}

function ensureStoreShape(store: NimbusStore): NimbusStore {
  return {
    ...store,
    version: 4,
    projects: store.projects.map((project) => ({
      ...project,
      color: coerceProjectColor(
        (project as Project & { color?: unknown }).color,
        project.id,
      ),
      categories: Array.isArray(project.categories) ? project.categories : [],
    })),
    activities: store.activities.map((activity) =>
      normalizeActivity(activity as unknown as Record<string, unknown>),
    ),
    tasks: coerceTasks(store.tasks),
  }
}

type LegacyProject = Omit<Project, "personIds" | "categories"> & {
  people?: unknown
}
type LegacyActivity = {
  id: string
  title: string
  description: string
  projectId: string | null
  source: Activity["source"]
  type: Activity["type"]
  status: Activity["status"]
  priority: Activity["priority"]
  waitingReason: string
  driveUrl: string
  createdAt: string
  updatedAt: string
  requester?: unknown
  waitingOn?: unknown
  closingNote?: unknown
}

export function migrateLegacyStore(value: unknown): NimbusStore {
  const legacy = value as {
    projects: LegacyProject[]
    activities: LegacyActivity[]
  }
  const people: Person[] = []
  const byKey = new Map<string, Person>()

  const projects: Project[] = legacy.projects.map((project) => {
    const { people: peopleRaw, ...rest } = project
    const personIds =
      typeof peopleRaw === "string"
        ? splitPeopleList(peopleRaw)
            .map((name) => upsertFromName(people, byKey, name))
            .filter((id): id is string => Boolean(id))
        : []
    return { ...rest, personIds, categories: [] }
  })

  const activities: Activity[] = legacy.activities.map((activity) => {
    const { requester, waitingOn, ...rest } = activity
    return normalizeActivity({
      ...rest,
      requesterId:
        typeof requester === "string"
          ? upsertFromName(people, byKey, requester)
          : null,
      waitingOnPersonId:
        typeof waitingOn === "string"
          ? upsertFromName(people, byKey, waitingOn)
          : null,
      categoryId: null,
      closingNote:
        typeof rest.closingNote === "string" ? rest.closingNote : "",
      attachments: [],
    })
  })

  return { version: 4, people, projects, activities, tasks: [] }
}

export function migrateV2Store(value: unknown): NimbusStore {
  const v2 = value as {
    people: NimbusStore["people"]
    projects: Array<Omit<Project, "categories"> & { categories?: unknown }>
    activities: Array<Record<string, unknown>>
  }
  return migrateV3Store({
    version: 3,
    people: v2.people,
    projects: v2.projects.map((project) => ({
      ...project,
      categories: Array.isArray(project.categories)
        ? (project.categories as Project["categories"])
        : [],
    })),
    activities: v2.activities,
  })
}

export function migrateV3Store(value: unknown): NimbusStore {
  const v3 = value as {
    people: Person[]
    projects: Project[]
    activities: Array<
      Record<string, unknown> & {
        id: string
        dueDate?: unknown
        assigneeIds?: unknown
      }
    >
  }
  const tasks: Task[] = []
  const activities: Activity[] = v3.activities.map((raw) => {
    const dueDate = typeof raw.dueDate === "string" ? raw.dueDate : null
    const assigneeIds = Array.isArray(raw.assigneeIds)
      ? raw.assigneeIds.filter((id): id is string => typeof id === "string")
      : []
    if (dueDate || assigneeIds.length > 0) {
      const day =
        dueDate ??
        (typeof raw.createdAt === "string"
          ? raw.createdAt.slice(0, 10)
          : nowISO().slice(0, 10))
      tasks.push({
        id: newId(),
        activityId: raw.id,
        startsAt: `${day}T12:00`,
        endsAt: null,
        personIds: assigneeIds,
        notes: "",
      })
    }
    return normalizeActivity(raw)
  })
  return {
    version: 4,
    people: v3.people,
    projects: v3.projects,
    activities,
    tasks,
  }
}

export function coerceNimbusStore(
  value: unknown,
): { store: NimbusStore; migrated: boolean } | null {
  if (isNimbusStore(value)) {
    return { store: ensureStoreShape(value), migrated: false }
  }
  if (isV3NimbusStore(value)) {
    return { store: ensureStoreShape(migrateV3Store(value)), migrated: true }
  }
  if (isV2NimbusStore(value)) {
    return { store: ensureStoreShape(migrateV2Store(value)), migrated: true }
  }
  if (isLegacyNimbusStore(value)) {
    return { store: ensureStoreShape(migrateLegacyStore(value)), migrated: true }
  }
  return null
}
