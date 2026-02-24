# Production Email — Resend SMTP Setup

## Context

Auth emails (confirmation, password reset) currently use Supabase's built-in email service which has severe rate limits (~4/hour) and sends from a generic Supabase domain. For production, we need a proper email provider. Resend is the fastest to set up and has a generous free tier (100 emails/day).

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
# Check if there's any existing email configuration
grep -rn "email\|smtp\|resend\|sendgrid" .env* --include="*.local" --include="*.example" 2>/dev/null
grep -rn "email\|smtp" lib/ app/ --include="*.ts" -l
```

## Step 1 — What needs to happen (mostly Supabase dashboard config)

This is primarily a CONFIGURATION task, not a code task. Here's what Lukas needs to do manually:

### A. Sign up for Resend (https://resend.com)
- Create account
- Add and verify domain (e.g., `ensurance.app` or whatever the domain is)
- Get API key

### B. Configure Supabase to use Resend SMTP
In Supabase Dashboard → Settings → Authentication → SMTP Settings:
- Enable custom SMTP
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: [Resend API key]
- Sender email: `noreply@yourdomain.com`
- Sender name: `Ensurance`

### C. Customize email templates
In Supabase Dashboard → Authentication → Email Templates:

**Confirmation email:**
```
Subject: Confirm your Ensurance account
Body: Welcome to Ensurance! Click the link below to verify your email and get started.
{{ .ConfirmationURL }}
```

**Password reset email:**
```
Subject: Reset your Ensurance password
Body: We received a request to reset your password. Click below to set a new one.
{{ .ConfirmationURL }}
If you didn't request this, you can safely ignore this email.
```

## Step 2 — Code changes (minimal)

Create a setup documentation file:

```bash
# Create docs/email-setup.md with the instructions above
```

Also create an env example if one doesn't exist:

```bash
# .env.example or .env.local.example
# Add a comment noting that SMTP is configured in Supabase dashboard, not here
# SMTP_PROVIDER=resend (configured in Supabase Dashboard → Settings → Auth → SMTP)
```

## Step 3 — Optional: Transactional emails beyond auth

If we want to send emails from the app itself later (quote summaries, follow-up reminders), install the Resend SDK:

```bash
bun add resend
```

Create `lib/email/resend.ts`:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: 'Ensurance <noreply@yourdomain.com>',
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }

  return data;
}
```

Add `RESEND_API_KEY` to the env variables list.

This is OPTIONAL for now — only needed if we want to send emails from the app (not just auth). The auth emails go through Supabase SMTP which is configured in the dashboard.

## Step 4 — Verify

If Resend SDK was installed:
```bash
npx tsc --noEmit
bun run build
```

## Rules

- Auth emails are handled by Supabase SMTP config — no code changes needed for that
- The Resend SDK install is optional/future — only do it if it makes sense
- Don't hardcode any API keys
- Create the documentation file so Lukas knows what to configure in dashboards
- This is mostly a manual setup task — the prompt exists to document what needs to happen
