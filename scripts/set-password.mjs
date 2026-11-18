#!/usr/bin/env node
// Sets the local login password for a Nimbus account in users.json.
// Usage: npm run set-password [-- email]

import { randomBytes, randomUUID, scrypt } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { createInterface } from "node:readline/promises"
import { promisify } from "node:util"

// Must stay in sync with src/lib/auth/password.ts.
const KEY_LENGTH = 64
const MIN_LENGTH = 8

function dataDir() {
  const dir = process.env.NIMBUS_DATA_DIR?.trim()
  if (dir) return dir
  const filePath = process.env.NIMBUS_DATA_PATH?.trim()
  if (filePath) return path.dirname(filePath)
  return path.join(process.cwd(), "data")
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await promisify(scrypt)(password.normalize("NFC"), salt, KEY_LENGTH)
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`
}

async function readUsers(file) {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"))
    if (parsed?.version !== 1 || !Array.isArray(parsed.users)) {
      throw new Error(`${file} non è un file utenti Nimbus valido`)
    }
    return parsed
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, users: [] }
    throw error
  }
}

async function writeUsers(file, value) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  await rename(tmp, file)
}

function askHidden(prompt) {
  const { stdin, stdout } = process
  if (!stdin.isTTY) {
    throw new Error("Serve un terminale interattivo per inserire la password")
  }
  stdout.write(prompt)
  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding("utf8")
  return new Promise((resolve, reject) => {
    let value = ""
    const done = (error) => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.off("data", onData)
      stdout.write("\n")
      if (error) reject(error)
      else resolve(value)
    }
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return done()
        if (char === "\u0003") return done(new Error("Annullato"))
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1)
        else if (char >= " ") value += char
      }
    }
    stdin.on("data", onData)
  })
}

async function main() {
  const file = path.join(dataDir(), "users.json")
  const usersFile = await readUsers(file)

  let email = process.argv[2]?.trim().toLowerCase() ?? ""
  if (!email) {
    if (usersFile.users.length > 0) {
      console.log("Account esistenti:")
      for (const user of usersFile.users) {
        const flag = user.passwordHash ? " (password impostata)" : ""
        console.log(`  - ${user.email}${flag}`)
      }
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    email = (await rl.question("Email dell'account: ")).trim().toLowerCase()
    rl.close()
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email non valida")
  }

  const password = await askHidden("Nuova password: ")
  if (password.length < MIN_LENGTH) {
    throw new Error(`La password deve avere almeno ${MIN_LENGTH} caratteri`)
  }
  if ((await askHidden("Ripeti la password: ")) !== password) {
    throw new Error("Le password non coincidono")
  }

  const passwordHash = await hashPassword(password)
  const existing = usersFile.users.find((user) => user.email === email)
  if (existing) {
    existing.passwordHash = passwordHash
  } else {
    usersFile.users.push({
      id: randomUUID(),
      email,
      googleSub: null,
      passwordHash,
      createdAt: new Date().toISOString(),
    })
  }
  await writeUsers(file, usersFile)
  console.log(
    existing
      ? `Password aggiornata per ${email}.`
      : `Account ${email} creato con la nuova password.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
