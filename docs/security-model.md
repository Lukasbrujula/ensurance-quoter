# Security Model

## Authentication
- **Supabase Auth** (email/password)
- Session-based with HTTP-only cookies via `@supabase/ssr`
- Middleware enforces auth on protected routes (`/leads`, `/quote`, `/settings`, `/agents`, `/dashboard`, `/pipeline`, `/calendar`)
- Password policy: 10+ characters, uppercase, lowercase, number, special character (GLBA-appropriate)
- Auth rate limits configured in Supabase Dashboard (5 logins / 5 min, 3 signups / 15 min)

## Authorization (Row-Level Security)
- **All 11 tables** have RLS enabled and enforced
- Agents can only access their own data via `agent_id = auth.uid()` policies
- Child tables (call_logs, enrichments, quotes) verify ownership through parent lead
- Service role bypasses RLS — used **only** for:
  - Cron jobs (data retention cleanup — no user session)
  - Telnyx webhooks (external inbound — no user session)
  - AI lead processor (webhook-triggered — no user session)

## Encryption

### In Transit
- HTTPS/TLS enforced via HSTS header (max-age 2 years, includeSubDomains, preload)
- WebSocket connections to Supabase, Telnyx, Deepgram use WSS

### At Rest (Disk)
- Supabase provides AES-256 disk encryption for all database storage

### Column-Level (Application)
- **AES-256-GCM** authenticated encryption with scrypt key derivation
- Random salt + IV per encryption call (no reuse)
- Encryption key (`ENCRYPTION_SECRET`) is separate from database credentials
- **Encrypted fields:**
  - `call_logs.transcript_text` — verbatim call conversations
  - `call_logs.ai_summary` — health details from AI analysis
  - `call_logs.coaching_hints` — medication alerts, personality data
  - `lead_notes.content` — agent notes about clients
- Backward-compatible: unencrypted legacy data is returned as-is

## Data Retention
| Data Type | Retention | After Expiry |
|---|---|---|
| Full transcripts | 90 days | NULL (AI summary kept) |
| Coaching hints | 90 days | NULL |
| AI summaries | 1 year | NULL |
| Enrichment data (PDL) | 1 year | Row deleted |
| Call log metadata | 2 years | Kept (duration, direction, date) |
| Lead notes | No limit | Agent-managed |
| Lead PII | No limit | Agent-managed |

Retention enforced by daily cron (`POST /api/jobs/retention`, Vercel Cron at 3 AM UTC).

## API Security
- **Rate limiting**: Upstash Redis distributed rate limiter across 5 tiers (api, auth, enrichment, webhook, agents)
- **CSRF protection**: Origin/Referer validation on all mutating requests
- **Auth guard**: Dual auth — Supabase session cookies OR internal API secret (timing-safe)
- **Webhook verification**: ED25519 signature + 5-minute replay protection for Telnyx webhooks
- **Input validation**: Zod schemas on all API endpoints

## Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy`: restrictive CSP with explicit allowlist for external services

## Environment Secrets
| Secret | Purpose | Rotation |
|---|---|---|
| `ENCRYPTION_SECRET` | Column-level encryption key | **NEVER** change (data becomes unreadable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role database access | Rotate in Supabase Dashboard |
| `INTERNAL_API_SECRET` | Server-to-server API auth | Rotate manually |
| `CRON_SECRET` | Retention cron authentication | Rotate manually |
| `TELNYX_WEBHOOK_PUBLIC_KEY` | Webhook signature verification | Provided by Telnyx |

## Compliance
- GLBA-appropriate password and data handling for financial services
- Email enumeration protection (generic error messages, timing normalization)
- No PII in error messages or client-facing responses
- Audit logging via `activity_logs` table (all lead mutations tracked)
