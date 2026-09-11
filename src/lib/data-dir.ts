import path from "node:path"

export function resolveDataDir(): string {
  const dir = process.env.NIMBUS_DATA_DIR?.trim()
  if (dir) return dir
  const filePath = process.env.NIMBUS_DATA_PATH?.trim()
  if (filePath) return path.dirname(filePath)
  return path.join(process.cwd(), "data")
}

export function legacyStorePath(): string {
  const filePath = process.env.NIMBUS_DATA_PATH?.trim()
  if (filePath) return filePath
  return path.join(resolveDataDir(), "nimbus.json")
}

export function usersFilePath(): string {
  return path.join(resolveDataDir(), "users.json")
}

export function userStorePath(userId: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Identificativo utente non valido")
  }
  return path.join(resolveDataDir(), "stores", `${userId}.json`)
}

export function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  )
}
