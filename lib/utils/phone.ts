/* ------------------------------------------------------------------ */
/*  Shared phone number utilities                                      */
/* ------------------------------------------------------------------ */

/** Normalize a phone number to E.164 format (US numbers). */
export function normalizeToE164(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  if (phone.startsWith("+") && digits.length >= 10) return `+${digits}`
  return `+${digits}`
}

/** Format E.164 number as (XXX) XXX-XXXX for display. */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  const national = digits.startsWith("1") ? digits.slice(1) : digits
  if (national.length !== 10) return phone
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
}

/** Extract last 10 digits from a phone number for comparison. */
export function phoneLast10(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.length > 10 ? digits.slice(-10) : digits
}
