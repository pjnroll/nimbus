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
      const family = addr.family
      if (family !== "IPv4" && family !== 4) continue
      if (addr.internal) continue
      hosts.add(addr.address)
    }
  }
  return [...hosts]
}

const nextConfig: NextConfig = {
  allowedDevOrigins: localDevOrigins(),
  experimental: {
    proxyClientMaxBodySize: "25mb",
  },
}

export default nextConfig
