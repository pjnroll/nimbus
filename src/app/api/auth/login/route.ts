import { NextResponse } from "next/server"
import { setSessionCookie } from "@/lib/auth/session"
import { authenticateUser } from "@/lib/auth/users"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    const email =
      body && typeof body === "object" && "email" in body
        ? String((body as { email: unknown }).email ?? "")
        : ""
    const password =
      body && typeof body === "object" && "password" in body
        ? String((body as { password: unknown }).password ?? "")
        : ""
    const user = await authenticateUser(email, password)
    if (!user) {
      return NextResponse.json(
        { error: "Email o password non corretti" },
        { status: 401 },
      )
    }
    await setSessionCookie(user)
    return NextResponse.json(user)
  } catch {
    return NextResponse.json(
      { error: "Non riesco ad accedere" },
      { status: 500 },
    )
  }
}
