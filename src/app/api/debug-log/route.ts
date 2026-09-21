import { appendFile } from "node:fs/promises"
import { NextResponse } from "next/server"

const LOG_PATH = "/home/pier/Documenti/dev/nimbus/.cursor/debug-b36c36.log"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    await appendFile(LOG_PATH, `${JSON.stringify(payload)}\n`, "utf8")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
