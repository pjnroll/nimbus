import { mkdir, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

let chain: Promise<void> = Promise.resolve()

export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  try {
    await rename(tmp, file)
  } catch {
    await unlink(file).catch(() => undefined)
    await rename(tmp, file)
  }
}
