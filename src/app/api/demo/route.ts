import { NextResponse } from "next/server"
import { DEMO_COOKIE, demoCookieOptions } from "@/lib/auth/demo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  // Relative Location keeps the host the user opened, so the cookie is sent back.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/" },
  })
  response.cookies.set(DEMO_COOKIE, "1", demoCookieOptions())
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(DEMO_COOKIE, "", { ...demoCookieOptions(), maxAge: 0 })
  return response
}
