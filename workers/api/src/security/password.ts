const PASSWORD_ITERATIONS = 210000
const PASSWORD_HASH = "SHA-256"
const PASSWORD_KEY_LENGTH = 32
const PASSWORD_ALGO = `pbkdf2_sha256:${PASSWORD_ITERATIONS}`

const encoder = new TextEncoder()

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim()
  const bytes = new Uint8Array(normalized.length / 2)

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(normalized.slice(index * 2, index * 2 + 2), 16)
  }

  return bytes
}

function randomHex(bytes = 16): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return bytesToHex(buffer)
}

async function deriveHash(password: string, salt: string): Promise<string> {
  const imported = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  )

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: PASSWORD_HASH,
      iterations: PASSWORD_ITERATIONS,
      salt: hexToBytes(salt)
    },
    imported,
    PASSWORD_KEY_LENGTH * 8
  )

  return bytesToHex(new Uint8Array(derived))
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return diff === 0
}

export async function hashPassword(password: string): Promise<{
  hash: string
  salt: string
  algorithm: string
}> {
  const salt = randomHex()
  const hash = await deriveHash(password, salt)

  return {
    hash,
    salt,
    algorithm: PASSWORD_ALGO
  }
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const derived = await deriveHash(password, salt)
  return constantTimeEqual(derived, hash)
}

export function isPasswordHashSupported(algorithm?: string | null): boolean {
  return algorithm === PASSWORD_ALGO
}
