import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import {
  activityAttachmentPath,
  activityAttachmentsDir,
  isNotFound,
  userStorePath,
} from "@/lib/data-dir"
import { nowISO } from "@/lib/dates"
import {
  MAX_ATTACHMENT_BYTES,
  sanitizeUploadName,
} from "@/lib/attachments"
import { enqueue, writeJsonAtomic } from "@/lib/persist-fs"
import { coerceNimbusStore, newId } from "@/lib/people"
import type { ActivityAttachment, NimbusStore } from "@/lib/types"

export class AttachmentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function loadStore(userId: string): Promise<NimbusStore> {
  const raw = await readFile(userStorePath(userId), "utf8")
  const coerced = coerceNimbusStore(JSON.parse(raw) as unknown)
  if (!coerced) {
    throw new AttachmentError("File dati Nimbus non valido", 500)
  }
  return coerced.store
}

function requireActivity(store: NimbusStore, activityId: string) {
  const activity = store.activities.find((item) => item.id === activityId)
  if (!activity) {
    throw new AttachmentError("Attività non trovata", 404)
  }
  return activity
}

export function addAttachments(
  userId: string,
  activityId: string,
  files: { name: string; type: string; data: Buffer }[],
): Promise<{ store: NimbusStore; attachments: ActivityAttachment[] }> {
  return enqueue(async () => {
    const store = await loadStore(userId)
    requireActivity(store, activityId)
    const added: ActivityAttachment[] = []
    for (const file of files) {
      if (file.data.byteLength === 0) {
        throw new AttachmentError("Il file è vuoto", 400)
      }
      if (file.data.byteLength > MAX_ATTACHMENT_BYTES) {
        throw new AttachmentError("Il file supera i 20 MB", 400)
      }
      const attachment: ActivityAttachment = {
        id: newId(),
        name: sanitizeUploadName(file.name),
        size: file.data.byteLength,
        mimeType: file.type.trim() || "application/octet-stream",
        createdAt: nowISO(),
      }
      const dest = activityAttachmentPath(userId, activityId, attachment.id)
      await mkdir(activityAttachmentsDir(userId, activityId), { recursive: true })
      await writeFile(dest, file.data)
      added.push(attachment)
    }
    const next: NimbusStore = {
      ...store,
      activities: store.activities.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              attachments: [...activity.attachments, ...added],
              updatedAt: nowISO(),
            }
          : activity,
      ),
    }
    await writeJsonAtomic(userStorePath(userId), next)
    return { store: next, attachments: added }
  })
}

export function readAttachmentFile(
  userId: string,
  activityId: string,
  attachmentId: string,
): Promise<{ attachment: ActivityAttachment; data: Buffer }> {
  return enqueue(async () => {
    const store = await loadStore(userId)
    const activity = requireActivity(store, activityId)
    const attachment = activity.attachments.find((item) => item.id === attachmentId)
    if (!attachment) {
      throw new AttachmentError("Allegato non trovato", 404)
    }
    try {
      const data = await readFile(
        activityAttachmentPath(userId, activityId, attachmentId),
      )
      return { attachment, data }
    } catch (error) {
      if (isNotFound(error)) {
        throw new AttachmentError("Allegato non trovato", 404)
      }
      throw error
    }
  })
}

export function removeAttachment(
  userId: string,
  activityId: string,
  attachmentId: string,
): Promise<NimbusStore> {
  return enqueue(async () => {
    const store = await loadStore(userId)
    const activity = requireActivity(store, activityId)
    if (!activity.attachments.some((item) => item.id === attachmentId)) {
      throw new AttachmentError("Allegato non trovato", 404)
    }
    await rm(activityAttachmentPath(userId, activityId, attachmentId), {
      force: true,
    })
    const next: NimbusStore = {
      ...store,
      activities: store.activities.map((item) =>
        item.id === activityId
          ? {
              ...item,
              attachments: item.attachments.filter(
                (attachment) => attachment.id !== attachmentId,
              ),
              updatedAt: nowISO(),
            }
          : item,
      ),
    }
    await writeJsonAtomic(userStorePath(userId), next)
    return next
  })
}

export function purgeActivityAttachments(
  userId: string,
  activityId: string,
): Promise<void> {
  return enqueue(async () => {
    await rm(activityAttachmentsDir(userId, activityId), {
      recursive: true,
      force: true,
    })
  })
}
