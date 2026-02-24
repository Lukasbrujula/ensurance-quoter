import { z } from "zod"
import { Resend } from "resend"

/* ------------------------------------------------------------------ */
/*  Resend client — transactional emails (quote summaries, reminders)  */
/* ------------------------------------------------------------------ */

const RESEND_API_KEY = process.env.RESEND_API_KEY

let _client: Resend | null = null

function getClient(): Resend {
  if (_client) return _client
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured")
  }
  _client = new Resend(RESEND_API_KEY)
  return _client
}

const SENDER = process.env.RESEND_FROM

if (!SENDER && RESEND_API_KEY) {
  console.warn(
    "[email] RESEND_FROM not configured — emails will use placeholder sender",
  )
}

const DEFAULT_SENDER = "Ensurance <noreply@yourdomain.com>"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(50_000),
})

type SendEmailInput = z.infer<typeof sendEmailSchema>

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function sendEmail(input: SendEmailInput) {
  const validated = sendEmailSchema.parse(input)

  const resend = getClient()

  const { data, error } = await resend.emails.send({
    from: SENDER ?? DEFAULT_SENDER,
    to: validated.to,
    subject: validated.subject,
    html: validated.html,
  })

  if (error) {
    throw new Error("Failed to send email")
  }

  return data
}
