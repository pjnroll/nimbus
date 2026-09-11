import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/persist-store"
import { isNimbusStore } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const result = await readStore()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Non riesco a leggere i dati" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json()
    if (!isNimbusStore(body)) {
      return NextResponse.json(
        { error: "JSON non riconosciuto come dati Nimbus" },
        { status: 400 },
      )
    }
    await writeStore(body)
    return NextResponse.json({ store: body, created: false })
  } catch {
    return NextResponse.json(
      { error: "Non riesco a salvare i dati" },
      { status: 500 },
    )
  }
}
