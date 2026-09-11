import { nowISO } from "@/lib/dates"
import {
  isLegacyNimbusStore,
  isNimbusStore,
  type Activity,
  type NimbusStore,
  type Person,
  type Project,
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
  activity: Pick<Activity, "assigneeIds" | "requesterId" | "waitingOnPersonId">,
): string[] {
  const ids = [
    ...activity.assigneeIds,
    activity.requesterId,
    activity.waitingOnPersonId,
  ]
  return ids.filter((id): id is string => Boolean(id))
}

export function activityPersonHaystack(
  people: Person[],
  activity: Pick<Activity, "assigneeIds" | "requesterId" | "waitingOnPersonId">,
): string {
  return personNames(people, activityPersonIds(activity))
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

type LegacyProject = Omit<Project, "personIds"> & { people?: unknown }
type LegacyActivity = Omit<
  Activity,
  "assigneeIds" | "requesterId" | "waitingOnPersonId"
> & {
  requester?: unknown
  waitingOn?: unknown
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
    return { ...rest, personIds }
  })

  const activities: Activity[] = legacy.activities.map((activity) => {
    const { requester, waitingOn, ...rest } = activity
    return {
      ...rest,
      assigneeIds: [],
      requesterId:
        typeof requester === "string"
          ? upsertFromName(people, byKey, requester)
          : null,
      waitingOnPersonId:
        typeof waitingOn === "string"
          ? upsertFromName(people, byKey, waitingOn)
          : null,
    }
  })

  return { version: 2, people, projects, activities }
}

export function coerceNimbusStore(
  value: unknown,
): { store: NimbusStore; migrated: boolean } | null {
  if (isNimbusStore(value)) return { store: value, migrated: false }
  if (isLegacyNimbusStore(value)) {
    return { store: migrateLegacyStore(value), migrated: true }
  }
  return null
}
