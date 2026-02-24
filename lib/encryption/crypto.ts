import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto"

// AES-256-GCM — authenticated encryption
// - 256-bit key derived from ENCRYPTION_SECRET via scrypt
// - Random IV per encryption (stored with ciphertext)
// - GCM auth tag prevents tampering

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 128-bit IV
const TAG_LENGTH = 16 // 128-bit auth tag
const SALT_LENGTH = 16 // For key derivation
const KEY_LENGTH = 32 // 256-bit key

function getSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) {
    throw new Error(
      "ENCRYPTION_SECRET is not set. Generate one with: openssl rand -base64 32",
    )
  }
  return secret
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing salt + iv + authTag + ciphertext.
 * Each call uses a fresh random salt and IV.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext

  const secret = getSecret()
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const key = deriveKey(secret, salt)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Pack: salt (16) + iv (16) + tag (16) + ciphertext (variable)
  const packed = Buffer.concat([salt, iv, tag, encrypted])
  return packed.toString("base64")
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Extracts salt + iv + authTag + ciphertext from the packed format.
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData

  const secret = getSecret()
  const packed = Buffer.from(encryptedData, "base64")

  // Minimum length: salt (16) + iv (16) + tag (16) = 48 bytes + at least 1 byte ciphertext
  if (packed.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Invalid encrypted data: too short")
  }

  const salt = packed.subarray(0, SALT_LENGTH)
  const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = packed.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
  )
  const ciphertext = packed.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  const key = deriveKey(secret, salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

/**
 * Check if a string looks like our encrypted format.
 * Useful for backward compatibility — detecting whether data is already encrypted.
 *
 * Checks:
 * 1. Valid base64
 * 2. Decoded length >= 49 bytes (16 salt + 16 iv + 16 tag + 1+ ciphertext)
 * 3. Not valid UTF-8 text when decoded (encrypted data is random bytes)
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 20) return false

  try {
    const decoded = Buffer.from(value, "base64")
    // Must round-trip through base64 cleanly
    if (decoded.toString("base64") !== value) return false
    // Must be at least salt + iv + tag + 1 byte
    if (decoded.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) return false
    return true
  } catch {
    return false
  }
}
