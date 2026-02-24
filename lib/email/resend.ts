import { Resend } from "resend"

/* ------------------------------------------------------------------ */
/*  Resend client — transactional emails (quote summaries, reminders)  */
/* ------------------------------------------------------------------ */

const RESEND_API_KEY = process.env.RESEND_API_KEY

function getClient(): Resend {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured")
  }
  return new Resend(RESEND_API_KEY)
}

const SENDER =
  process.env.RESEND_FROM ?? "Ensurance <noreply@yourdomain.com>"

interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const resend = getClient()

  const { data, error } = await resend.emails.send({
    from: SENDER,
    to,
    subject,
    html,
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return data
}
