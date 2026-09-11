import { readFile } from "node:fs/promises"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import type { SessionUser } from "@/lib/auth/token"
import { isNotFound, usersFilePath } from "@/lib/data-dir"
import { nowISO } from "@/lib/dates"
import { enqueue, writeJsonAtomic } from "@/lib/persist-fs"
import { provisionUserStore } from "@/lib/persist-store"

export type UserRecord = {
  id: string
  email: string
  passwordHash: string
  createdAt: string
}

export type UsersFile = {
  version: 1
  users: UserRecord[]
}

const EMPTY_USERS: UsersFile = { version: 1, users: [] }

function isUsersFile(value: unknown): value is UsersFile {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<UsersFile>
  return candidate.version === 1 && Array.isArray(candidate.users)
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
    if (!isUsersFile(parsed)) {
      throw new Error("File utenti Nimbus non valido")
    }
    return parsed
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

export function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = normalizeEmail(email)
  return enqueue(async () => {
    const file = await readUsersNow()
    return file.users.find((user) => user.email === normalized) ?? null
  })
}

export function createUser(
  email: string,
  password: string,
): Promise<SessionUser> {
  const normalized = normalizeEmail(email)
  return enqueue(async () => {
    if (!envAllowsRegister()) {
      const current = await readUsersNow()
      if (current.users.length > 0) {
        throw new Error("register-disabled")
      }
    }
    const file = await readUsersNow()
    if (file.users.some((user) => user.email === normalized)) {
      throw new Error("email-taken")
    }
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash: await hashPassword(password),
      createdAt: nowISO(),
    }
    await writeJsonAtomic(usersFilePath(), {
      version: 1,
      users: [...file.users, user],
    })
    await provisionUserStore(user.id, file.users.length === 0)
    return toPublic(user)
  })
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  const ok = await verifyPassword(password, user.passwordHash)
  return ok ? toPublic(user) : null
}
