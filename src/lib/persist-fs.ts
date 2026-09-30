import { mkdir, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

/** Data files are private to the account running Nimbus. */
export const PRIVATE_FILE_MODE = 0o600
export const PRIVATE_DIR_MODE = 0o700

let chain: Promise<void> = Promise.resolve()

export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function ensurePrivateDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: PRIVATE_DIR_MODE })
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await ensurePrivateDir(path.dirname(file))
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: PRIVATE_FILE_MODE,
  })
  try {
    await rename(tmp, file)
  } catch {
    await unlink(file).catch(() => undefined)
    await rename(tmp, file)
  }
}
