/** Returns the URL only if it is an absolute http(s) link, otherwise "". */
export function safeHttpUrl(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""
  try {
    const url = new URL(trimmed)
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : ""
  } catch {
    return ""
  }
}
