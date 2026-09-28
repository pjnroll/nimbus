import { appendFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

const LOG_PATH = path.join(
  process.cwd(),
  ".cursor",
  "debug-b36c36.log",
)
const INGEST =
  "http://127.0.0.1:7925/ingest/0c835834-643c-4ae6-96f5-b2e1662b0892"

export async function POST(request: Request) {
  let payload: Record<string, unknown> = {}
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    payload = { message: "invalid-json" }
  }
  const entry = {
    sessionId: "b36c36",
    timestamp: Date.now(),
    ...payload,
  }
  const line = `${JSON.stringify(entry)}\n`
  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true })
    await appendFile(LOG_PATH, line, "utf8")
  } catch {
    // ignore disk errors on remote hosts
  }
  try {
    await fetch(INGEST, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "b36c36",
      },
      body: JSON.stringify(entry),
    })
  } catch {
    // ingest only available on the Cursor host
  }
  return NextResponse.json({ ok: true })
}
