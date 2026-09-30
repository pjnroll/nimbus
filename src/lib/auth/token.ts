import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "nimbus_session"
export const SESSION_MAX_AGE = 60 * 60 * 24

export type SessionUser = {
  id: string
  email: string
}

const INSECURE_DEV_SECRET = "nimbus-dev-secret-change-me"

// Proxy and route handlers may run in separate module graphs, so the random
// dev secret lives on globalThis to stay the same across them in one process.
const devSecretHolder = globalThis as typeof globalThis & {
  __nimbusDevSecret?: string
}

function randomDevSecret(): string {
  if (!devSecretHolder.__nimbusDevSecret) {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    devSecretHolder.__nimbusDevSecret = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
    console.warn(
      "[nimbus] NIMBUS_AUTH_SECRET non impostato: uso un segreto casuale, le sessioni scadono al riavvio.",
    )
  }
  return devSecretHolder.__nimbusDevSecret
}

export function authSecretKey(): Uint8Array {
  const fromEnv = process.env.NIMBUS_AUTH_SECRET?.trim()
  if (fromEnv) return new TextEncoder().encode(fromEnv)
  if (process.env.NODE_ENV === "production") {
    throw new Error("Imposta NIMBUS_AUTH_SECRET")
  }
  const secret =
    process.env.NIMBUS_ALLOW_INSECURE_DEV_SECRET === "1"
      ? INSECURE_DEV_SECRET
      : randomDevSecret()
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(authSecretKey())
}

export async function readSessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, authSecretKey())
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null
    }
    return { id: payload.sub, email: payload.email }
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  }
}
