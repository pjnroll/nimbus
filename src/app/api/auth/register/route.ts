import { NextResponse } from "next/server"
import { setSessionCookie } from "@/lib/auth/session"
import { createUser, isValidEmail, normalizeEmail } from "@/lib/auth/users"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    const email =
      body && typeof body === "object" && "email" in body
        ? normalizeEmail(String((body as { email: unknown }).email ?? ""))
        : ""
    const password =
      body && typeof body === "object" && "password" in body
        ? String((body as { password: unknown }).password ?? "")
        : ""
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La password deve avere almeno 8 caratteri" },
        { status: 400 },
      )
    }
    const user = await createUser(email, password)
    await setSessionCookie(user)
    return NextResponse.json(user)
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message === "email-taken") {
      return NextResponse.json(
        { error: "Questa email è già registrata" },
        { status: 409 },
      )
    }
    if (message === "register-disabled") {
      return NextResponse.json(
        { error: "La registrazione è disabilitata" },
        { status: 403 },
      )
    }
    return NextResponse.json(
      { error: "Non riesco a creare l’account" },
      { status: 500 },
    )
  }
}
