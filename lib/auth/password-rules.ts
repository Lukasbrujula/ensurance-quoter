/* ------------------------------------------------------------------ */
/*  Password Policy — shared between register + set-password forms      */
/*  GLBA-appropriate for financial services (insurance agents).         */
/* ------------------------------------------------------------------ */

import { z } from "zod"

/**
 * Zod schema for password validation.
 * Used in both registration and password-reset forms.
 */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character")

/**
 * Visual checklist rules for real-time password strength feedback.
 */
export const PASSWORD_RULES = [
  { test: (pw: string) => pw.length >= 10, label: "At least 10 characters" },
  { test: (pw: string) => /[A-Z]/.test(pw), label: "One uppercase letter" },
  { test: (pw: string) => /[a-z]/.test(pw), label: "One lowercase letter" },
  { test: (pw: string) => /[0-9]/.test(pw), label: "One number" },
  {
    test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
    label: "One special character",
  },
] as const
