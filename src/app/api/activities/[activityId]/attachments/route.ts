import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import {
  AttachmentError,
  addAttachments,
  purgeActivityAttachments,
} from "@/lib/persist-attachments"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function fail(error: unknown) {
  if (error instanceof AttachmentError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (
    error instanceof Error &&
    (error.message.includes("non valido") || error.message.includes("Identificativo"))
  ) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json(
    { error: "Non riesco a gestire gli allegati" },
    { status: 500 },
  )
}

export async function POST(
  request: Request,
  context: { params: Promise<{ activityId: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }
  try {
    const { activityId } = await context.params
    const form = await request.formData()
    const uploads = form
      .getAll("file")
      .filter((value): value is File => value instanceof File)
    if (uploads.length === 0) {
      return NextResponse.json(
        { error: "Seleziona almeno un file" },
        { status: 400 },
      )
    }
    const files = await Promise.all(
      uploads.map(async (file) => ({
        name: file.name,
        type: file.type,
        data: Buffer.from(await file.arrayBuffer()),
      })),
    )
    const result = await addAttachments(session.id, activityId, files)
    return NextResponse.json({
      store: result.store,
      attachments: result.attachments,
    })
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ activityId: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }
  try {
    const { activityId } = await context.params
    await purgeActivityAttachments(session.id, activityId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return fail(error)
  }
}
