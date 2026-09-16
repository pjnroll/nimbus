import { NextResponse, type NextRequest } from "next/server"
import {
  googleCredentials,
  googleProfileFromCode,
  loginErrorUrl,
  oauthStateCookieOptions,
  OAUTH_STATE_COOKIE,
  publicOrigin,
  readOAuthState,
} from "@/lib/auth/google"
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/token"
import { upsertGoogleUser } from "@/lib/auth/users"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function clearOAuthCookie(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    ...oauthStateCookieOptions(),
    maxAge: 0,
  })
}

export async function GET(request: NextRequest) {
  const fail = (error: string) => {
    const response = NextResponse.redirect(loginErrorUrl(request, error))
    clearOAuthCookie(response)
    return response
  }

  const denied = request.nextUrl.searchParams.get("error")
  if (denied === "access_denied") {
    return fail("denied")
  }
  if (denied) {
    return fail("oauth")
  }

  const credentials = googleCredentials()
  if (!credentials) {
    return fail("config")
  }

  const code = request.nextUrl.searchParams.get("code")
  const nonce = request.nextUrl.searchParams.get("state")
  const signed = request.cookies.get(OAUTH_STATE_COOKIE)?.value

  if (!code || !nonce || !signed) {
    return fail("oauth")
  }

  const next = await readOAuthState(signed, nonce)
  if (!next) {
    return fail("oauth")
  }

  try {
    const profile = await googleProfileFromCode(request, credentials, code)
    const user = await upsertGoogleUser(profile)
    const token = await createSessionToken(user)
    const response = NextResponse.redirect(new URL(next, publicOrigin(request)))
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    clearOAuthCookie(response)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message === "register-disabled") {
      return fail("closed")
    }
    return fail("oauth")
  }
}
