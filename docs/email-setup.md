# Email Setup — Resend SMTP

Auth emails (confirmation, password reset) use Supabase's built-in email
service by default. For production, configure a custom SMTP provider to
remove rate limits and send from your own domain.

**Provider:** [Resend](https://resend.com) (free tier: 100 emails/day)

---

## 1. Sign up for Resend

1. Create an account at <https://resend.com>
2. Add and verify your domain (e.g., `ensurance.app`)
3. Copy your API key

## 2. Configure Supabase SMTP

In **Supabase Dashboard > Settings > Authentication > SMTP Settings**:

| Field        | Value                      |
|--------------|----------------------------|
| Enable SMTP  | ON                         |
| Host         | `smtp.resend.com`          |
| Port         | `465`                      |
| Username     | `resend`                   |
| Password     | *(your Resend API key)*    |
| Sender email | `noreply@yourdomain.com`   |
| Sender name  | `Ensurance`                |

## 3. Customize Email Templates

In **Supabase Dashboard > Authentication > Email Templates**:

### Confirmation email

```
Subject: Confirm your Ensurance account

Welcome to Ensurance! Click the link below to verify your email and get started.

{{ .ConfirmationURL }}
```

### Password reset email

```
Subject: Reset your Ensurance password

We received a request to reset your password. Click below to set a new one.

{{ .ConfirmationURL }}

If you didn't request this, you can safely ignore this email.
```

## 4. Transactional Emails (App-sent)

For emails sent from the application (quote summaries, follow-up reminders),
the Resend SDK is installed and ready to use.

Add to `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
```

Usage:

```typescript
import { sendEmail } from "@/lib/email/resend"

await sendEmail({
  to: "client@example.com",
  subject: "Your Quote Summary",
  html: "<p>Here are your top carrier recommendations...</p>",
})
```

## 5. Verify

After configuring SMTP:
1. Register a new test account
2. Confirm the email arrives from your domain (not Supabase)
3. Test password reset flow
