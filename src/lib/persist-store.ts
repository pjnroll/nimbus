import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { SEED_STORE } from "@/lib/seed"
import { isNimbusStore, type NimbusStore } from "@/lib/types"

export type PersistedStore = {
  store: NimbusStore
  created: boolean
}

let chain: Promise<void> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function resolveDataPath(): string {
  const fromEnv = process.env.NIMBUS_DATA_PATH?.trim()
  if (fromEnv) return fromEnv
  return path.join(process.cwd(), "data", "nimbus.json")
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  )
}

async function writeStoreNow(store: NimbusStore): Promise<void> {
  const file = resolveDataPath()
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8")
  try {
    await rename(tmp, file)
  } catch {
    await unlink(file).catch(() => undefined)
    await rename(tmp, file)
  }
}

export function readStore(): Promise<PersistedStore> {
  return enqueue(async () => {
    const file = resolveDataPath()
    try {
      const raw = await readFile(file, "utf8")
      const parsed: unknown = JSON.parse(raw)
      if (!isNimbusStore(parsed)) {
        throw new Error("File dati Nimbus non valido")
      }
      return { store: parsed, created: false }
    } catch (error) {
      if (!isNotFound(error)) throw error
      await writeStoreNow(SEED_STORE)
      return { store: SEED_STORE, created: true }
    }
  })
}

export function writeStore(store: NimbusStore): Promise<void> {
  return enqueue(() => writeStoreNow(store))
}
