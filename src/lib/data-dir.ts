import path from "node:path"

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const FILE_ID_RE = /^[a-zA-Z0-9._-]+$/

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
  if (!UUID_RE.test(userId)) {
    throw new Error("Identificativo utente non valido")
  }
  return path.join(resolveDataDir(), "stores", `${userId}.json`)
}

export function assertFileId(id: string, label: string): void {
  if (!id || !FILE_ID_RE.test(id) || id.includes("..")) {
    throw new Error(`${label} non valido`)
  }
}

export function activityAttachmentsDir(
  userId: string,
  activityId: string,
): string {
  if (!UUID_RE.test(userId)) {
    throw new Error("Identificativo utente non valido")
  }
  assertFileId(activityId, "Identificativo attività")
  return path.join(resolveDataDir(), "files", userId, activityId)
}

export function activityAttachmentPath(
  userId: string,
  activityId: string,
  attachmentId: string,
): string {
  assertFileId(attachmentId, "Identificativo allegato")
  return path.join(
    activityAttachmentsDir(userId, activityId),
    attachmentId,
  )
}

export function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  )
}
