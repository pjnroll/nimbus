import type { NimbusStore } from "@/lib/types"

export const MAX_STORE_BODY_BYTES = 5 * 1024 * 1024
export const MAX_UPLOAD_BODY_BYTES = 25 * 1024 * 1024
export const MAX_FILES_PER_UPLOAD = 10

const STORE_COUNT_LIMITS = {
  people: 2000,
  projects: 500,
  activities: 5000,
  tasks: 5000,
} as const

export function userQuotaBytes(): number {
  const raw = Number(process.env.NIMBUS_USER_QUOTA_MB)
  const mb = Number.isFinite(raw) && raw > 0 ? raw : 200
  return mb * 1024 * 1024
}

export function usedAttachmentBytes(store: NimbusStore): number {
  return store.activities.reduce(
    (total, activity) =>
      total +
      activity.attachments.reduce((sum, attachment) => sum + attachment.size, 0),
    0,
  )
}

export function storeWithinLimits(store: NimbusStore): boolean {
  return (
    store.people.length <= STORE_COUNT_LIMITS.people &&
    store.projects.length <= STORE_COUNT_LIMITS.projects &&
    store.activities.length <= STORE_COUNT_LIMITS.activities &&
    store.tasks.length <= STORE_COUNT_LIMITS.tasks
  )
}

/** Rejects early on a declared oversize body; the caller still checks the real size. */
export function declaredBodyTooLarge(request: Request, max: number): boolean {
  const declared = Number(request.headers.get("content-length"))
  return Number.isFinite(declared) && declared > max
}
