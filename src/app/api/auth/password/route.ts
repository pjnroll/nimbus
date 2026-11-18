import { NextResponse, type NextRequest } from "next/server"
import { DEMO_COOKIE, demoCookieOptions } from "@/lib/auth/demo"
import { safeNextPath } from "@/lib/auth/next-path"
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/token"
import { verifyPasswordLogin } from "@/lib/auth/users"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const MAX_FIELD_LENGTH = 512

type Failures = { count: number; resetAt: number }

const failures = new Map<string, Failures>()

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || "unknown"
}

function isBlocked(key: string, now: number): boolean {
  const entry = failures.get(key)
  if (!entry) return false
  if (entry.resetAt <= now) {
    failures.delete(key)
    return false
  }
  return entry.count >= MAX_FAILURES
}

function recordFailure(key: string, now: number): void {
  const entry = failures.get(key)
  if (!entry || entry.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  entry.count += 1
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).host === request.headers.get("host")
  } catch {
    return false
  }
}

function field(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : ""
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Origine non valida" }, { status: 403 })
  }

  const key = clientKey(request)
  const now = Date.now()
  if (isBlocked(key, now)) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova tra qualche minuto." },
      { status: 429 },
    )
  }

  const body: unknown = await request.json().catch(() => null)
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const email = field(payload.email)
  const password = field(payload.password)
  if (!email || !password) {
    return NextResponse.json(
      { error: "Inserisci email e password." },
      { status: 400 },
    )
  }

  const user = await verifyPasswordLogin(email, password)
  if (!user) {
    recordFailure(key, now)
    return NextResponse.json(
      { error: "Email o password non corretti." },
      { status: 401 },
    )
  }

  failures.delete(key)
  const token = await createSessionToken(user)
  const response = NextResponse.json({ next: safeNextPath(field(payload.next)) })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  response.cookies.set(DEMO_COOKIE, "", { ...demoCookieOptions(), maxAge: 0 })
  return response
}
