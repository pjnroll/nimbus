import os from "node:os"
import type { NextConfig } from "next"

function localDevOrigins(): string[] {
  const hosts = new Set(["127.0.0.1", "localhost"])
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
}

export default nextConfig
