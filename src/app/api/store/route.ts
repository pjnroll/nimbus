import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { coerceNimbusStore } from "@/lib/people"
import { readStore, writeStore } from "@/lib/persist-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }
  try {
    const result = await readStore(session.id)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Non riesco a leggere i dati" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }
  try {
    const body: unknown = await request.json()
    const coerced = coerceNimbusStore(body)
    if (!coerced) {
      return NextResponse.json(
        { error: "JSON non riconosciuto come dati Nimbus" },
        { status: 400 },
      )
    }
    await writeStore(session.id, coerced.store)
    return NextResponse.json({ store: coerced.store, created: false })
  } catch {
    return NextResponse.json(
      { error: "Non riesco a salvare i dati" },
      { status: 500 },
    )
  }
}
