import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import {
  AttachmentError,
  readAttachmentFile,
  removeAttachment,
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

function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "")
  return `attachment; filename="${ascii || "allegato"}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ activityId: string; attachmentId: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }
  try {
    const { activityId, attachmentId } = await context.params
    const { attachment, data } = await readAttachmentFile(
      session.id,
      activityId,
      attachmentId,
    )
      return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": contentDisposition(attachment.name),
        "Content-Length": String(data.byteLength),
      },
    })
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ activityId: string; attachmentId: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }
  try {
    const { activityId, attachmentId } = await context.params
    const store = await removeAttachment(session.id, activityId, attachmentId)
    return NextResponse.json({ store })
  } catch (error) {
    return fail(error)
  }
}
