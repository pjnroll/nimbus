import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "nimbus_session"
export const SESSION_MAX_AGE = 60 * 60 * 24

export type SessionUser = {
  id: string
  email: string
}

function secretKey(): Uint8Array {
  const fromEnv = process.env.NIMBUS_AUTH_SECRET?.trim()
  const secret =
    fromEnv ||
    (process.env.NODE_ENV === "production"
      ? ""
      : "nimbus-dev-secret-change-me")
  if (!secret) {
    throw new Error("Imposta NIMBUS_AUTH_SECRET")
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey())
}

export async function readSessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
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
