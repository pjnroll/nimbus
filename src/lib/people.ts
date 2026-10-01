import { isISODate, nowISO } from "@/lib/dates"
import { coerceProjectColor } from "@/lib/project-color"
import { safeHttpUrl } from "@/lib/urls"
import {
  isLegacyNimbusStore,
  isNimbusStore,
  isV2NimbusStore,
  isV3NimbusStore,
  isV4NimbusStore,
  isV5NimbusStore,
  type Activity,
  type NimbusStore,
  type Person,
  type PersonKind,
  type Project,
  type Task,
} from "@/lib/types"

const MAX_SHORT_TEXT = 300
const MAX_LONG_TEXT = 10_000

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

export function uniqueStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const ids: string[] = []
  for (const item of value) {
    if (typeof item !== "string" || !item || seen.has(item)) continue
    seen.add(item)
    ids.push(item)
  }
  return ids
}

export function inferPersonKind(name: string): PersonKind {
  return /^team\s/i.test(name.trim()) ? "team" : "persona"
}

export function makePerson(
  name: string,
  kind: PersonKind = "persona",
): Person {
  return {
    id: newId(),
    name,
    kind,
    memberIds: [],
    archivedAt: null,
  }
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

export function activePeople(people: Person[]): Person[] {
  return people.filter((person) => !person.archivedAt)
}

export function activityPersonIds(
  activity: Pick<
    Activity,
    | "requesterId"
    | "responsibleId"
    | "participantIds"
    | "waitingOnPersonId"
  >,
  task?: Pick<Task, "executorIds"> | null,
): string[] {
  return uniqueStringIds([
    ...(task?.executorIds ?? []),
    ...(activity.participantIds ?? []),
    activity.requesterId,
    activity.responsibleId,
    activity.waitingOnPersonId,
  ])
}

export function activityPersonHaystack(
  people: Person[],
  activity: Pick<
    Activity,
    | "requesterId"
    | "responsibleId"
    | "participantIds"
    | "waitingOnPersonId"
  >,
  task?: Pick<Task, "executorIds"> | null,
): string {
  return personNames(people, activityPersonIds(activity, task))
}

export function upsertPersonInStore(
  store: NimbusStore,
  raw: string,
  kind: PersonKind = "persona",
): { store: NimbusStore; person: Person | null } {
  const name = cleanPersonName(raw)
  if (!name) return { store, person: null }
  const existing = findPersonByName(store.people, name)
  if (existing) return { store, person: existing }
  const person = makePerson(name, kind)
  return {
    store: { ...store, people: [...store.people, person] },
    person,
  }
}

export function updatePersonInStore(
  store: NimbusStore,
  id: string,
  patch: Partial<Pick<Person, "name" | "kind" | "memberIds" | "archivedAt">>,
): NimbusStore {
  return {
    ...store,
    people: store.people.map((person) => {
      if (person.id !== id) return person
      const name =
        patch.name === undefined ? person.name : cleanPersonName(patch.name)
      const kind = patch.kind ?? person.kind
      const memberIds =
        kind === "team"
          ? uniqueStringIds(patch.memberIds ?? person.memberIds)
          : []
      return {
        ...person,
        name: name || person.name,
        kind,
        memberIds,
        archivedAt:
          patch.archivedAt === undefined ? person.archivedAt : patch.archivedAt,
      }
    }),
  }
}

export function archivePersonInStore(
  store: NimbusStore,
  id: string,
): NimbusStore {
  return updatePersonInStore(store, id, { archivedAt: nowISO() })
}

export function restorePersonInStore(
  store: NimbusStore,
  id: string,
): NimbusStore {
  return updatePersonInStore(store, id, { archivedAt: null })
}

export function ensurePersonOnProject(
  store: NimbusStore,
  projectId: string,
  personId: string,
): NimbusStore {
  const project = store.projects.find((item) => item.id === projectId)
  if (!project || project.participantIds.includes(personId)) return store
  return {
    ...store,
    projects: store.projects.map((item) =>
      item.id === projectId
        ? {
            ...item,
            participantIds: [...item.participantIds, personId],
            updatedAt: nowISO(),
          }
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
  const person = makePerson(name, inferPersonKind(name))
  people.push(person)
  byKey.set(key, person)
  return person.id
}

export function safeMimeType(value: unknown): string {
  return typeof value === "string" &&
    /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/i.test(
      value.trim(),
    )
    ? value.trim()
    : "application/octet-stream"
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : ""
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
      name: candidate.name.slice(0, 200),
      size: candidate.size,
      mimeType: safeMimeType(candidate.mimeType),
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
    const candidate = item as Record<string, unknown>
    if (typeof candidate.id !== "string" || !candidate.id) continue
    if (typeof candidate.activityId !== "string" || !candidate.activityId) {
      continue
    }
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
      executorIds: uniqueStringIds(
        Array.isArray(candidate.executorIds)
          ? candidate.executorIds
          : candidate.personIds,
      ),
      notes: text(candidate.notes, MAX_LONG_TEXT),
    })
  }
  return tasks
}

function coercePerson(raw: unknown): Person | null {
  if (!raw || typeof raw !== "object") return null
  const candidate = raw as Record<string, unknown>
  if (typeof candidate.id !== "string" || !candidate.id) return null
  const name = text(candidate.name, MAX_SHORT_TEXT)
  const kind: PersonKind =
    candidate.kind === "team" || candidate.kind === "persona"
      ? candidate.kind
      : inferPersonKind(name)
  return {
    id: candidate.id,
    name,
    kind,
    memberIds: kind === "team" ? uniqueStringIds(candidate.memberIds) : [],
    archivedAt:
      typeof candidate.archivedAt === "string" ? candidate.archivedAt : null,
  }
}

function coerceProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null
  const candidate = raw as Record<string, unknown>
  if (typeof candidate.id !== "string" || !candidate.id) return null
  const status =
    candidate.status === "in_attesa" || candidate.status === "chiuso"
      ? candidate.status
      : "attivo"
  return {
    id: candidate.id,
    name: text(candidate.name, MAX_SHORT_TEXT),
    client: text(candidate.client, MAX_SHORT_TEXT),
    status,
    color: coerceProjectColor(candidate.color, candidate.id),
    driveUrl: safeHttpUrl(text(candidate.driveUrl, MAX_LONG_TEXT)),
    managerId: typeof candidate.managerId === "string" ? candidate.managerId : null,
    participantIds: uniqueStringIds(
      Array.isArray(candidate.participantIds)
        ? candidate.participantIds
        : candidate.personIds,
    ),
    categories: Array.isArray(candidate.categories)
      ? candidate.categories.flatMap((category) => {
          if (!category || typeof category !== "object") return []
          const item = category as { id?: unknown; name?: unknown }
          if (typeof item.id !== "string" || !item.id) return []
          return [{ id: item.id, name: text(item.name, MAX_SHORT_TEXT) }]
        })
      : [],
    notes: text(candidate.notes, MAX_LONG_TEXT),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : nowISO(),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : nowISO(),
  }
}

function normalizeActivity(raw: Record<string, unknown>): Activity {
  const requesterId =
    typeof raw.requesterId === "string" ? raw.requesterId : null
  const responsibleId =
    typeof raw.responsibleId === "string" ? raw.responsibleId : null
  return {
    id: String(raw.id ?? ""),
    title: text(raw.title, MAX_SHORT_TEXT),
    description: text(raw.description, MAX_LONG_TEXT),
    projectId: typeof raw.projectId === "string" ? raw.projectId : null,
    source:
      raw.source === "email" || raw.source === "chat" || raw.source === "altro"
        ? raw.source
        : "altro",
    requesterId,
    responsibleId,
    participantIds: uniqueStringIds(raw.participantIds),
    reminderOn: isISODate(raw.reminderOn) ? raw.reminderOn : null,
    status:
      raw.status === "inbox"
        ? "in_attesa"
        : raw.status === "in_corso" ||
            raw.status === "in_attesa" ||
            raw.status === "fatto" ||
            raw.status === "fallita"
          ? raw.status
          : "in_attesa",
    priority:
      raw.priority === "alta" || raw.priority === "bassa" ? raw.priority : "media",
    waitingOnPersonId:
      typeof raw.waitingOnPersonId === "string" ? raw.waitingOnPersonId : null,
    waitingReason: text(raw.waitingReason, MAX_LONG_TEXT),
    closingNote: text(raw.closingNote, MAX_LONG_TEXT),
    driveUrl: safeHttpUrl(text(raw.driveUrl, MAX_LONG_TEXT)),
    attachments: coerceAttachments(raw.attachments),
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowISO(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowISO(),
  }
}

function ensureStoreShape(store: NimbusStore): NimbusStore {
  return {
    ...store,
    version: 6,
    people: store.people
      .map((person) => coercePerson(person))
      .filter((person): person is Person => Boolean(person)),
    projects: store.projects
      .map((project) => coerceProject(project))
      .filter((project): project is Project => Boolean(project)),
    activities: store.activities.map((activity) =>
      normalizeActivity(activity as unknown as Record<string, unknown>),
    ),
    tasks: coerceTasks(store.tasks),
  }
}

type LegacyProject = {
  id: string
  name: string
  client: string
  status: Project["status"]
  driveUrl: string
  notes: string
  createdAt: string
  updatedAt: string
  people?: unknown
  color?: unknown
}

type LegacyActivity = {
  id: string
  title: string
  description: string
  projectId: string | null
  source: Activity["source"]
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

type StoreV5 = {
  version: 5
  people: unknown[]
  projects: unknown[]
  activities: unknown[]
  tasks: unknown[]
}

/**
 * v5 → v6:
 * - ownerId → responsibleId (fallback requesterId)
 * - delegateId → activity.participantIds (preserves involvement, not execution)
 * - type eseguo/coordino dropped
 * - project.personIds → participantIds; managerId stays null
 * - task.personIds → executorIds
 * - Person.kind inferred (team if name starts with "team ")
 *
 * Tasks that coexisted with delegateId are kept. The old XOR filter is gone.
 */
export function migrateV5ToV6(value: unknown): NimbusStore {
  const v5 = value as StoreV5
  const people = v5.people
    .map((person) => coercePerson(person))
    .filter((person): person is Person => Boolean(person))
  const projects = v5.projects
    .map((project) => coerceProject(project))
    .filter((project): project is Project => Boolean(project))
    .map((project) => ({ ...project, managerId: project.managerId ?? null }))
  const activities = v5.activities.map((item) => {
    const raw =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {}
    const ownerId = typeof raw.ownerId === "string" ? raw.ownerId : null
    const requesterId =
      typeof raw.requesterId === "string" ? raw.requesterId : null
    const responsibleId =
      typeof raw.responsibleId === "string"
        ? raw.responsibleId
        : ownerId ?? requesterId
    const delegateId =
      typeof raw.delegateId === "string" ? raw.delegateId : null
    const participantIds = uniqueStringIds(raw.participantIds)
    if (
      delegateId &&
      delegateId !== responsibleId &&
      delegateId !== requesterId &&
      !participantIds.includes(delegateId)
    ) {
      participantIds.push(delegateId)
    }
    return normalizeActivity({
      ...raw,
      requesterId,
      responsibleId,
      participantIds,
    })
  })
  return {
    version: 6,
    people,
    projects,
    activities,
    tasks: coerceTasks(v5.tasks),
  }
}

export function migrateLegacyStore(value: unknown): StoreV5 {
  const legacy = value as {
    projects: LegacyProject[]
    activities: LegacyActivity[]
  }
  const people: Person[] = []
  const byKey = new Map<string, Person>()

  const projects = legacy.projects.map((project) => {
    const { people: peopleRaw, ...rest } = project
    const personIds =
      typeof peopleRaw === "string"
        ? splitPeopleList(peopleRaw)
            .map((name) => upsertFromName(people, byKey, name))
            .filter((id): id is string => Boolean(id))
        : []
    return { ...rest, personIds, categories: [] }
  })

  const activities = legacy.activities.map((activity) => {
    const { requester, waitingOn, ...rest } = activity
    return {
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
    }
  })

  return { version: 5, people, projects, activities, tasks: [] }
}

export function migrateV2Store(value: unknown): StoreV5 {
  const v2 = value as {
    people: unknown[]
    projects: Array<Record<string, unknown> & { categories?: unknown }>
    activities: unknown[]
  }
  return migrateV3Store({
    version: 3,
    people: v2.people,
    projects: v2.projects.map((project) => ({
      ...project,
      categories: Array.isArray(project.categories) ? project.categories : [],
    })),
    activities: v2.activities,
  })
}

export function migrateV3Store(value: unknown): StoreV5 {
  const v3 = value as {
    people: unknown[]
    projects: unknown[]
    activities: Array<
      Record<string, unknown> & {
        id: string
        dueDate?: unknown
        assigneeIds?: unknown
      }
    >
  }
  const tasks: unknown[] = []
  const activities = v3.activities.map((raw) => {
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
    return raw
  })
  return {
    version: 5,
    people: v3.people,
    projects: v3.projects,
    activities,
    tasks,
  }
}

export function migrateV4Store(value: unknown): StoreV5 {
  const v4 = value as Omit<StoreV5, "version"> & { version: 4 }
  return {
    ...v4,
    version: 5,
  }
}

export function coerceNimbusStore(
  value: unknown,
): { store: NimbusStore; migrated: boolean } | null {
  if (isNimbusStore(value)) {
    return { store: ensureStoreShape(value), migrated: false }
  }
  if (isV5NimbusStore(value)) {
    return { store: ensureStoreShape(migrateV5ToV6(value)), migrated: true }
  }
  if (isV4NimbusStore(value)) {
    return {
      store: ensureStoreShape(migrateV5ToV6(migrateV4Store(value))),
      migrated: true,
    }
  }
  if (isV3NimbusStore(value)) {
    return {
      store: ensureStoreShape(migrateV5ToV6(migrateV3Store(value))),
      migrated: true,
    }
  }
  if (isV2NimbusStore(value)) {
    return {
      store: ensureStoreShape(migrateV5ToV6(migrateV2Store(value))),
      migrated: true,
    }
  }
  if (isLegacyNimbusStore(value)) {
    return {
      store: ensureStoreShape(migrateV5ToV6(migrateLegacyStore(value))),
      migrated: true,
    }
  }
  return null
}
