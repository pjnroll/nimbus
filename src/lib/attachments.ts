export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

export function attachmentDownloadPath(
  activityId: string,
  attachmentId: string,
): string {
  return `/api/activities/${encodeURIComponent(activityId)}/attachments/${encodeURIComponent(attachmentId)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function sanitizeUploadName(raw: string): string {
  const base = raw.replace(/[/\\]+/g, "").trim()
  return base.slice(0, 200) || "allegato"
}
