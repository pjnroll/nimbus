import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { DEMO_COOKIE } from "@/lib/auth/demo"
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth/token"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/register" || pathname.startsWith("/register/")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const isApi = pathname.startsWith("/api/")
  const isPublic =
    pathname.startsWith("/login") ||
    pathname === "/privacy" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/demo"

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await readSessionToken(token) : null
  const demo = !session && request.cookies.get(DEMO_COOKIE)?.value === "1"

  if (!session && !isPublic && !(demo && !isApi)) {
    if (isApi) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }
    const login = new URL("/login", request.url)
    if (pathname !== "/") {
      login.searchParams.set("next", pathname)
    }
    return NextResponse.redirect(login)
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
