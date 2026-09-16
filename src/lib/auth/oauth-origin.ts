/** Google accepts HTTP only on loopback; other hosts need HTTPS and a name, not an IP. */

function stripBrackets(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase()
}

export function isLoopbackHostname(hostname: string): boolean {
  const host = stripBrackets(hostname)
  return host === "localhost" || host === "127.0.0.1" || host === "::1"
}

export function isIpHostname(hostname: string): boolean {
  const host = stripBrackets(hostname)
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true
  return host.includes(":")
}

export function googleOAuthOriginError(origin: string): boolean {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return true
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return true
  if (isLoopbackHostname(url.hostname)) return false
  if (url.protocol !== "https:") return true
  if (isIpHostname(url.hostname)) return true
  return false
}
