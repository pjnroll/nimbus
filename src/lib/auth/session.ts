import { cookies } from "next/headers"
import {
  SESSION_COOKIE,
  createSessionToken,
  readSessionToken,
  sessionCookieOptions,
  type SessionUser,
} from "@/lib/auth/token"

export type { SessionUser }

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  return readSessionToken(token)
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, sessionCookieOptions())
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 })
}
