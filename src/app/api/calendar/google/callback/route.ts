import { NextResponse, type NextRequest } from "next/server"
import {
  CALENDAR_ACCESS_COOKIE,
  CALENDAR_OAUTH_STATE_COOKIE,
  calendarAccessCookieOptions,
  calendarAccessTokenFromCode,
  calendarStateCookieOptions,
  googleCredentials,
} from "@/lib/auth/calendar"
import { publicOrigin, readOAuthState } from "@/lib/auth/google"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function agendaUrl(request: Request, flag: string): URL {
  const url = new URL("/", publicOrigin(request))
  url.searchParams.set("import", flag)
  return url
}

function clearState(response: NextResponse) {
  response.cookies.set(CALENDAR_OAUTH_STATE_COOKIE, "", {
    ...calendarStateCookieOptions(),
    maxAge: 0,
  })
}

export async function GET(request: NextRequest) {
  const fail = (flag: string) => {
    const response = NextResponse.redirect(agendaUrl(request, flag))
    clearState(response)
    return response
  }

  const denied = request.nextUrl.searchParams.get("error")
  if (denied === "access_denied") return fail("denied")
  if (denied) return fail("error")

  const credentials = googleCredentials()
  if (!credentials) return fail("error")

  const code = request.nextUrl.searchParams.get("code")
  const nonce = request.nextUrl.searchParams.get("state")
  const signed = request.cookies.get(CALENDAR_OAUTH_STATE_COOKIE)?.value
  if (!code || !nonce || !signed) return fail("error")

  const next = await readOAuthState(signed, nonce)
  if (next !== "/?import=meet") return fail("error")

  try {
    const accessToken = await calendarAccessTokenFromCode(
      request,
      credentials,
      code,
    )
    const response = NextResponse.redirect(agendaUrl(request, "meet"))
    response.cookies.set(
      CALENDAR_ACCESS_COOKIE,
      accessToken,
      calendarAccessCookieOptions(),
    )
    clearState(response)
    return response
  } catch {
    return fail("error")
  }
}
