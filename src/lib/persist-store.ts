import { readFile, unlink } from "node:fs/promises"
import { isNotFound, legacyStorePath, userStorePath } from "@/lib/data-dir"
import { enqueue, writeJsonAtomic } from "@/lib/persist-fs"
import { coerceNimbusStore } from "@/lib/people"
import { EMPTY_STORE } from "@/lib/seed"
import type { NimbusStore } from "@/lib/types"

export type PersistedStore = {
  store: NimbusStore
  created: boolean
}

async function readJsonStore(
  file: string,
): Promise<{ store: NimbusStore; migrated: boolean } | null> {
  try {
    const raw = await readFile(file, "utf8")
    const parsed: unknown = JSON.parse(raw)
    const coerced = coerceNimbusStore(parsed)
    if (!coerced) {
      throw new Error("File dati Nimbus non valido")
    }
    return coerced
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

export async function provisionUserStore(
  userId: string,
  migrateLegacy: boolean,
): Promise<void> {
  const dest = userStorePath(userId)
  if (migrateLegacy) {
    const legacy = await readJsonStore(legacyStorePath())
    if (legacy) {
      await writeJsonAtomic(dest, legacy.store)
      await unlink(legacyStorePath()).catch(() => undefined)
      return
    }
  }
  await writeJsonAtomic(dest, EMPTY_STORE)
}

export function readStore(userId: string): Promise<PersistedStore> {
  return enqueue(async () => {
    const file = userStorePath(userId)
    const existing = await readJsonStore(file)
    if (existing) {
      if (existing.migrated) {
        await writeJsonAtomic(file, existing.store)
      }
      return { store: existing.store, created: false }
    }
    await writeJsonAtomic(file, EMPTY_STORE)
    return { store: EMPTY_STORE, created: true }
  })
}

/** Attachment metadata is owned by the upload API: keep the server's copy. */
export function writeStore(
  userId: string,
  store: NimbusStore,
): Promise<NimbusStore> {
  return enqueue(async () => {
    const file = userStorePath(userId)
    const current = await readJsonStore(file)
    const serverAttachments = new Map(
      (current?.store.activities ?? []).map((activity) => [
        activity.id,
        activity.attachments,
      ]),
    )
    const next: NimbusStore = {
      ...store,
      activities: store.activities.map((activity) => ({
        ...activity,
        attachments: serverAttachments.get(activity.id) ?? [],
      })),
    }
    await writeJsonAtomic(file, next)
    return next
  })
}
