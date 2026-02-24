import { encrypt, decrypt, isEncrypted } from "./crypto"

/**
 * Returns a new object with specified string fields encrypted.
 * Skips null/undefined values. Non-string values (e.g. JSONB)
 * are JSON.stringify'd before encryption.
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj }

  for (const field of fields) {
    const value = result[field]
    if (value === null || value === undefined) continue

    const plaintext =
      typeof value === "string" ? value : JSON.stringify(value)

    if (!plaintext) continue

    result[field] = encrypt(plaintext) as T[keyof T]
  }

  return result
}

/**
 * Returns a new object with specified fields decrypted.
 * Handles mixed encrypted/unencrypted data gracefully (for migration).
 * If decryption fails on a field, logs a warning and returns "[encrypted]".
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj }

  for (const field of fields) {
    const value = result[field]
    if (value === null || value === undefined) continue
    if (typeof value !== "string") continue
    if (!value) continue

    // If it doesn't look encrypted, leave as-is (backward compatibility)
    if (!isEncrypted(value)) continue

    try {
      result[field] = decrypt(value) as T[keyof T]
    } catch {
      // Data may be unencrypted base64 that passed isEncrypted heuristic,
      // or encrypted with a different key. Return placeholder.
      result[field] = "[encrypted]" as T[keyof T]
    }
  }

  return result
}
