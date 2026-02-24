/**
 * Encryption library verification tests.
 *
 * Run with: npx tsx lib/encryption/__tests__/crypto.test.ts
 *
 * These are standalone assertions (no test runner required).
 */

// Set a test encryption secret
process.env.ENCRYPTION_SECRET = "dGVzdC1zZWNyZXQtZm9yLXVuaXQtdGVzdGluZy0xMjM="

import { encrypt, decrypt, isEncrypted } from "../crypto"
import { encryptFields, decryptFields } from "../field-encryption"

let passed = 0
let failed = 0

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`FAIL: ${name}`)
  }
}

// Test 1: Roundtrip
{
  const original = "Hello, sensitive data!"
  const encrypted = encrypt(original)
  const decrypted = decrypt(encrypted)
  assert(decrypted === original, "Roundtrip: encrypt → decrypt returns original")
}

// Test 2: Different ciphertexts for same plaintext (random IV)
{
  const text = "same input"
  const enc1 = encrypt(text)
  const enc2 = encrypt(text)
  assert(enc1 !== enc2, "Different encryptions produce different ciphertext")
  assert(decrypt(enc1) === text, "Both decrypt correctly (1)")
  assert(decrypt(enc2) === text, "Both decrypt correctly (2)")
}

// Test 3: Tampered ciphertext throws
{
  const encrypted = encrypt("tamper test")
  // Flip a byte in the middle
  const buf = Buffer.from(encrypted, "base64")
  buf[buf.length - 5] ^= 0xff
  const tampered = buf.toString("base64")
  let threw = false
  try {
    decrypt(tampered)
  } catch {
    threw = true
  }
  assert(threw, "Tampered ciphertext throws error (GCM auth)")
}

// Test 4: Empty string passthrough
{
  assert(encrypt("") === "", "Empty string encrypt returns empty")
  assert(decrypt("") === "", "Empty string decrypt returns empty")
}

// Test 5: isEncrypted detection
{
  const encrypted = encrypt("detect me")
  assert(isEncrypted(encrypted), "isEncrypted detects encrypted data")
  assert(!isEncrypted("just plain text"), "isEncrypted rejects plain text")
  assert(!isEncrypted(""), "isEncrypted rejects empty string")
  assert(!isEncrypted("short"), "isEncrypted rejects short string")
}

// Test 6: Unicode roundtrip
{
  const unicode = "María García — Ñoño: 日本語テスト 🔒"
  const decrypted = decrypt(encrypt(unicode))
  assert(decrypted === unicode, "Unicode roundtrip works")
}

// Test 7: Large text roundtrip
{
  const large = "A".repeat(100_000)
  const decrypted = decrypt(encrypt(large))
  assert(decrypted === large, "Large text (100KB) roundtrip works")
}

// Test 8: Field encryption helpers
{
  const obj = {
    name: "John",
    transcript: "sensitive call content",
    summary: "health details here",
    score: 42,
    empty: null as string | null,
  }
  const encrypted = encryptFields(obj, ["transcript", "summary"])
  assert(encrypted.name === "John", "encryptFields: non-target field unchanged")
  assert(encrypted.transcript !== "sensitive call content", "encryptFields: target field encrypted")
  assert(encrypted.empty === null, "encryptFields: null field skipped")

  const decrypted = decryptFields(encrypted, ["transcript", "summary"])
  assert(decrypted.transcript === "sensitive call content", "decryptFields: roundtrip works")
  assert(decrypted.summary === "health details here", "decryptFields: second field works")
}

// Test 9: decryptFields with mixed encrypted/unencrypted data
{
  const mixed = {
    oldField: "plain text from before encryption was added",
    newField: encrypt("newly encrypted"),
  }
  const decrypted = decryptFields(mixed, ["oldField", "newField"])
  assert(decrypted.oldField === "plain text from before encryption was added", "decryptFields: unencrypted data passes through")
  assert(decrypted.newField === "newly encrypted", "decryptFields: encrypted data decrypted")
}

// Results
console.log(`\nEncryption tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
