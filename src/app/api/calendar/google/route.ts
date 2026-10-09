import { NextResponse } from "next/server"
import {
  CALENDAR_IMPORT_PATH,
  CALENDAR_OAUTH_STATE_COOKIE,
  calendarAuthUrl,
  calendarStateCookieOptions,
  googleCredentials,
} from "@/lib/auth/calendar"
import {
  createOAuthState,
  loginErrorUrl,
  oauthOriginAllowed,
} from "@/lib/auth/google"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const credentials = googleCredentials()
  if (!credentials) {
    return NextResponse.redirect(loginErrorUrl(request, "config"))
  }
  try {
    if (!oauthOriginAllowed(request)) {
      return NextResponse.redirect(loginErrorUrl(request, "origin"))
    }
    const { nonce, signed } = await createOAuthState(CALENDAR_IMPORT_PATH)
    const response = NextResponse.redirect(
      calendarAuthUrl(request, credentials, nonce),
    )
    response.cookies.set(
      CALENDAR_OAUTH_STATE_COOKIE,
      signed,
      calendarStateCookieOptions(),
    )
    return response
  } catch {
    return NextResponse.redirect(loginErrorUrl(request, "config"))
  }
}
