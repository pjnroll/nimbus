import type { SessionUser } from "@/lib/auth/token"
import { isNotFound, usersFilePath } from "@/lib/data-dir"
import { nowISO } from "@/lib/dates"
import { enqueue, writeJsonAtomic } from "@/lib/persist-fs"
import { provisionUserStore } from "@/lib/persist-store"
import { readFile } from "node:fs/promises"

export type UserRecord = {
  id: string
  email: string
  googleSub: string | null
  createdAt: string
}

export type UsersFile = {
  version: 1
  users: UserRecord[]
}

export type GoogleProfile = {
  sub: string
  email: string
}

const EMPTY_USERS: UsersFile = { version: 1, users: [] }

function coerceUser(value: unknown): UserRecord | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<UserRecord>
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null
  }
  return {
    id: candidate.id,
    email: normalizeEmail(candidate.email),
    googleSub:
      typeof candidate.googleSub === "string" && candidate.googleSub
        ? candidate.googleSub
        : null,
    createdAt: candidate.createdAt,
  }
}

function coerceUsersFile(value: unknown): UsersFile | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<UsersFile>
  if (candidate.version !== 1 || !Array.isArray(candidate.users)) return null
  const users: UserRecord[] = []
  for (const raw of candidate.users) {
    const user = coerceUser(raw)
    if (!user) return null
    users.push(user)
  }
  return { version: 1, users }
}

function toPublic(user: UserRecord): SessionUser {
  return { id: user.id, email: user.email }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function envAllowsRegister(): boolean {
  const raw = process.env.NIMBUS_ALLOW_REGISTER?.trim().toLowerCase()
  return raw !== "false" && raw !== "0"
}

async function readUsersNow(): Promise<UsersFile> {
  try {
    const raw = await readFile(usersFilePath(), "utf8")
    const parsed: unknown = JSON.parse(raw)
    const coerced = coerceUsersFile(parsed)
    if (!coerced) {
      throw new Error("File utenti Nimbus non valido")
    }
    return coerced
  } catch (error) {
    if (isNotFound(error)) return EMPTY_USERS
    throw error
  }
}

export function listUsers(): Promise<UsersFile> {
  return enqueue(readUsersNow)
}

export async function canRegister(): Promise<boolean> {
  if (envAllowsRegister()) return true
  const file = await listUsers()
  return file.users.length === 0
}

async function writeUsers(users: UserRecord[]): Promise<void> {
  await writeJsonAtomic(usersFilePath(), { version: 1, users } satisfies UsersFile)
}

export function upsertGoogleUser(profile: GoogleProfile): Promise<SessionUser> {
  const normalized = normalizeEmail(profile.email)
  const sub = profile.sub.trim()
  return enqueue(async () => {
    if (!sub || !isValidEmail(normalized)) {
      throw new Error("invalid-google-profile")
    }
    const file = await readUsersNow()
    const bySub = file.users.find((user) => user.googleSub === sub)
    if (bySub) {
      if (bySub.email === normalized) return toPublic(bySub)
      const users = file.users.map((user) =>
        user.id === bySub.id ? { ...user, email: normalized } : user,
      )
      await writeUsers(users)
      return toPublic({ ...bySub, email: normalized })
    }
    const byEmail = file.users.find((user) => user.email === normalized)
    if (byEmail) {
      const linked = { ...byEmail, googleSub: sub }
      const users = file.users.map((user) =>
        user.id === byEmail.id ? linked : user,
      )
      await writeUsers(users)
      return toPublic(linked)
    }
    if (!envAllowsRegister() && file.users.length > 0) {
      throw new Error("register-disabled")
    }
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: normalized,
      googleSub: sub,
      createdAt: nowISO(),
    }
    await writeUsers([...file.users, user])
    await provisionUserStore(user.id, file.users.length === 0)
    return toPublic(user)
  })
}
