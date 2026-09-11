import { readFile, unlink } from "node:fs/promises"
import { isNotFound, legacyStorePath, userStorePath } from "@/lib/data-dir"
import { enqueue, writeJsonAtomic } from "@/lib/persist-fs"
import { SEED_STORE } from "@/lib/seed"
import { isNimbusStore, type NimbusStore } from "@/lib/types"

export type PersistedStore = {
  store: NimbusStore
  created: boolean
}

async function readJsonStore(file: string): Promise<NimbusStore | null> {
  try {
    const raw = await readFile(file, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!isNimbusStore(parsed)) {
      throw new Error("File dati Nimbus non valido")
    }
    return parsed
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
      await writeJsonAtomic(dest, legacy)
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
    if (existing) return { store: existing, created: false }
    await writeJsonAtomic(file, SEED_STORE)
    return { store: SEED_STORE, created: true }
  })
}

export function writeStore(userId: string, store: NimbusStore): Promise<void> {
  return enqueue(() => writeJsonAtomic(userStorePath(userId), store))
}
