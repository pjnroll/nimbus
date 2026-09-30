import os from "node:os"
import type { NextConfig } from "next"

function extraDevOrigins(): string[] {
  const raw = process.env.NIMBUS_APP_URL?.trim()
  if (!raw) return []
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`)
    return url.hostname ? [url.hostname] : []
  } catch {
    return []
  }
}

function localDevOrigins(): string[] {
  const hosts = new Set(["127.0.0.1", "localhost", ...extraDevOrigins()])
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      // Node types vary: family may be "IPv4" | "IPv6" or legacy numeric 4 | 6
      const family = String(addr.family)
      if (family !== "IPv4" && family !== "4") continue
      if (addr.internal) continue
      hosts.add(addr.address)
    }
  }
  return [...hosts]
}

// Full CSP with nonces is left out: the inline palette boot script would need one.
const CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ")

function securityHeaders() {
  const headers = [
    { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ]
  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    })
  }
  return headers
}

const nextConfig: NextConfig = {
  allowedDevOrigins: localDevOrigins(),
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: "25mb",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders() },
      {
        // Config headers override route headers, so the download sandbox is set here.
        source: "/api/activities/:activityId/attachments/:attachmentId",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `sandbox; default-src 'none'; ${CONTENT_SECURITY_POLICY}`,
          },
        ],
      },
    ]
  },
}

export default nextConfig
