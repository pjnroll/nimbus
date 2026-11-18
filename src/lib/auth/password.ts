import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

/** Must stay in sync with scripts/set-password.mjs, which writes the hashes. */
const KEY_LENGTH = 64
const PREFIX = "scrypt"

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFC"), salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return `${PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [prefix, saltHex, keyHex] = stored.split("$")
  if (prefix !== PREFIX || !saltHex || !keyHex) return false
  const expected = Buffer.from(keyHex, "hex")
  if (expected.length !== KEY_LENGTH) return false
  const key = await derive(password, Buffer.from(saltHex, "hex"))
  return timingSafeEqual(key, expected)
}
