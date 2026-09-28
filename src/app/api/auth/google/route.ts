import { NextResponse } from "next/server"
import {
  createOAuthState,
  googleAuthUrl,
  googleCredentials,
  loginErrorUrl,
  oauthOriginAllowed,
  oauthStateCookieOptions,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth/google"
import { safeNextPath } from "@/lib/auth/next-path"

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
    const next = safeNextPath(new URL(request.url).searchParams.get("next"))
    const { nonce, signed } = await createOAuthState(next)
    const response = NextResponse.redirect(
      googleAuthUrl(request, credentials, nonce),
    )
    response.cookies.set(OAUTH_STATE_COOKIE, signed, oauthStateCookieOptions())
    return response
  } catch {
    return NextResponse.redirect(loginErrorUrl(request, "config"))
  }
}
