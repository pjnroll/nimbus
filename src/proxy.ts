import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth/token"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/register" || pathname.startsWith("/register/")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const isPublic =
    pathname.startsWith("/login") || pathname.startsWith("/api/auth/")

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await readSessionToken(token) : null

  if (!session && !isPublic) {
    if (pathname.startsWith("/api/")) {
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
