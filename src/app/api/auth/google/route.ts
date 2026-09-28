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
  // #region agent log
  const failReason = !credentials
    ? "missing-google-credentials"
    : !process.env.NIMBUS_APP_URL?.trim()
      ? "missing-NIMBUS_APP_URL"
      : !process.env.NIMBUS_AUTH_SECRET?.trim()
        ? "missing-NIMBUS_AUTH_SECRET"
        : "ok-or-other"
  fetch(
    new URL("/api/debug-log", request.url).toString(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "b36c36",
        runId: "oauth-prod-1",
        hypothesisId: "F",
        location: "api/auth/google/route.ts:GET",
        message: "oauth-start-check",
        data: {
          nodeEnv: process.env.NODE_ENV,
          hasGoogleId: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
          hasGoogleSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
          hasAppUrl: Boolean(process.env.NIMBUS_APP_URL?.trim()),
          hasAuthSecret: Boolean(process.env.NIMBUS_AUTH_SECRET?.trim()),
          failReason,
        },
        timestamp: Date.now(),
      }),
    },
  ).catch(() => {})
  // #endregion
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
  } catch (error) {
    // #region agent log
    fetch(new URL("/api/debug-log", request.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "b36c36",
        runId: "oauth-prod-1",
        hypothesisId: "G",
        location: "api/auth/google/route.ts:catch",
        message: "oauth-start-threw",
        data: {
          errorName: error instanceof Error ? error.name : "unknown",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    return NextResponse.redirect(loginErrorUrl(request, "config"))
  }
}
