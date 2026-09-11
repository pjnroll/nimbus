import { readFile, unlink } from "node:fs/promises"
import { isNotFound, legacyStorePath, userStorePath } from "@/lib/data-dir"
import { enqueue, writeJsonAtomic } from "@/lib/persist-fs"
import { coerceNimbusStore } from "@/lib/people"
import { SEED_STORE } from "@/lib/seed"
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
  await writeJsonAtomic(dest, SEED_STORE)
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
    await writeJsonAtomic(file, SEED_STORE)
    return { store: SEED_STORE, created: true }
  })
}

export function writeStore(userId: string, store: NimbusStore): Promise<void> {
  return enqueue(() => writeJsonAtomic(userStorePath(userId), store))
}
