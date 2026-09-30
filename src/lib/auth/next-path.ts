const PROBE_ORIGIN = "http://nimbus.invalid"

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/"
  // Browsers treat "\" like "/" in URLs, so "/\evil.com" would leave the app.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/"
  try {
    const url = new URL(value, PROBE_ORIGIN)
    if (url.origin !== PROBE_ORIGIN) return "/"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/"
  }
}
