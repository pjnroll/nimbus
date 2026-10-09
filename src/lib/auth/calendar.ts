import { OAuth2Client } from "google-auth-library"
import {
  appOrigin,
  googleCredentials,
  oauthStateCookieOptions,
  type GoogleCredentials,
} from "@/lib/auth/google"

export const CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly"
export const CALENDAR_OAUTH_STATE_COOKIE = "nimbus_calendar_oauth_state"
export const CALENDAR_ACCESS_COOKIE = "nimbus_calendar_access"
export const CALENDAR_ACCESS_MAX_AGE = 50 * 60
export const CALENDAR_IMPORT_PATH = "/?import=meet"

export function calendarCallbackUrl(request: Request): string {
  return `${appOrigin(request)}/api/calendar/google/callback`
}

export function calendarAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CALENDAR_ACCESS_MAX_AGE,
  }
}

export function calendarStateCookieOptions() {
  return oauthStateCookieOptions()
}

function calendarClient(request: Request, credentials: GoogleCredentials) {
  return new OAuth2Client(
    credentials.clientId,
    credentials.clientSecret,
    calendarCallbackUrl(request),
  )
}

export function calendarAuthUrl(
  request: Request,
  credentials: GoogleCredentials,
  nonce: string,
): string {
  return calendarClient(request, credentials).generateAuthUrl({
    access_type: "online",
    include_granted_scopes: true,
    scope: [CALENDAR_SCOPE],
    state: nonce,
  })
}

export async function calendarAccessTokenFromCode(
  request: Request,
  credentials: GoogleCredentials,
  code: string,
): Promise<string> {
  const client = calendarClient(request, credentials)
  const { tokens } = await client.getToken(code)
  const accessToken = tokens.access_token?.trim() ?? ""
  if (!accessToken) throw new Error("missing-calendar-token")
  return accessToken
}

export { googleCredentials }
