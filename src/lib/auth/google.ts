import { randomBytes } from "node:crypto"
import { OAuth2Client } from "google-auth-library"
import { SignJWT, jwtVerify } from "jose"
import { safeNextPath } from "@/lib/auth/next-path"
import { googleOAuthOriginError } from "@/lib/auth/oauth-origin"
import { authSecretKey } from "@/lib/auth/token"

export const OAUTH_STATE_COOKIE = "nimbus_oauth_state"
export const OAUTH_STATE_MAX_AGE = 60 * 10

const SCOPES = ["openid", "email", "profile"]

export type GoogleCredentials = {
  clientId: string
  clientSecret: string
}

export function googleCredentials(): GoogleCredentials | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

function originFromRequest(request: Request): string {
  const fromEnv = process.env.NIMBUS_APP_URL?.trim().replace(/\/$/, "")
  if (fromEnv) return fromEnv
  const url = new URL(request.url)
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const protoHeader = request.headers.get("x-forwarded-proto")
  const proto = protoHeader?.split(",")[0]?.trim() || url.protocol.replace(":", "")
  if (host) return `${proto}://${host}`
  return url.origin
}

export function publicOrigin(request: Request): string {
  return originFromRequest(request)
}

export function appOrigin(request: Request): string {
  const fromEnv = process.env.NIMBUS_APP_URL?.trim().replace(/\/$/, "")
  if (fromEnv) return fromEnv
  if (process.env.NODE_ENV === "production") {
    throw new Error("Imposta NIMBUS_APP_URL")
  }
  return originFromRequest(request)
}

export function googleCallbackUrl(request: Request): string {
  return `${appOrigin(request)}/api/auth/google/callback`
}

export function oauthOriginAllowed(request: Request): boolean {
  return !googleOAuthOriginError(appOrigin(request))
}

export function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  }
}

export async function createOAuthState(next: string): Promise<{
  nonce: string
  signed: string
}> {
  const nonce = randomBytes(16).toString("hex")
  const signed = await new SignJWT({ next: safeNextPath(next) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(nonce)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(authSecretKey())
  return { nonce, signed }
}

export async function readOAuthState(
  signed: string,
  nonce: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(signed, authSecretKey())
    if (payload.sub !== nonce || typeof payload.next !== "string") return null
    return safeNextPath(payload.next)
  } catch {
    return null
  }
}

function oauthClient(request: Request, credentials: GoogleCredentials) {
  return new OAuth2Client(
    credentials.clientId,
    credentials.clientSecret,
    googleCallbackUrl(request),
  )
}

export function googleAuthUrl(
  request: Request,
  credentials: GoogleCredentials,
  nonce: string,
): string {
  return oauthClient(request, credentials).generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: SCOPES,
    state: nonce,
  })
}

export async function googleProfileFromCode(
  request: Request,
  credentials: GoogleCredentials,
  code: string,
): Promise<{ sub: string; email: string }> {
  const client = oauthClient(request, credentials)
  const { tokens } = await client.getToken(code)
  if (!tokens.id_token) {
    throw new Error("invalid-google-profile")
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: credentials.clientId,
  })
  const payload = ticket.getPayload()
  const sub = payload?.sub?.trim() ?? ""
  const email = payload?.email?.trim() ?? ""
  if (!sub || !email || payload?.email_verified !== true) {
    throw new Error("invalid-google-profile")
  }
  return { sub, email }
}

export function loginErrorUrl(request: Request, error: string): URL {
  const url = new URL("/login", publicOrigin(request))
  url.searchParams.set("error", error)
  return url
}
