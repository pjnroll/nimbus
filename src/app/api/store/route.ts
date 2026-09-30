import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import {
  MAX_STORE_BODY_BYTES,
  declaredBodyTooLarge,
  storeWithinLimits,
} from "@/lib/limits"
import { coerceNimbusStore } from "@/lib/people"
import { readStore, writeStore } from "@/lib/persist-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function tooLarge() {
  return NextResponse.json(
    { error: "Dati troppo grandi per essere salvati" },
    { status: 413 },
  )
}

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
  if (declaredBodyTooLarge(request, MAX_STORE_BODY_BYTES)) {
    return tooLarge()
  }
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, "utf8") > MAX_STORE_BODY_BYTES) {
      return tooLarge()
    }
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: "JSON non valido" }, { status: 400 })
    }
    const coerced = coerceNimbusStore(body)
    if (!coerced) {
      return NextResponse.json(
        { error: "JSON non riconosciuto come dati Nimbus" },
        { status: 400 },
      )
    }
    if (!storeWithinLimits(coerced.store)) {
      return tooLarge()
    }
    const saved = await writeStore(session.id, coerced.store)
    return NextResponse.json({ store: saved, created: false })
  } catch {
    return NextResponse.json(
      { error: "Non riesco a salvare i dati" },
      { status: 500 },
    )
  }
}
