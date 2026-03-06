# Telnyx Learnings

Reference for setting up and troubleshooting Telnyx WebRTC calling and AI Assistants in Ensurance.

---

## Environment Variables

Three env vars are required for WebRTC calling (outbound + test calls):

```bash
TELNYX_API_KEY=KEY...           # Telnyx V2 API key (Portal → API Keys)
TELNYX_CONNECTION_ID=...        # Credential Connection ID (see below)
TELNYX_CALLER_NUMBER=+1...     # E.164 phone number assigned to the connection
```

The AI key (`TELNYX_API_KEY`) is shared between WebRTC calling and the AI Assistants API. One key handles both.

---

## How the Pieces Fit Together

```
Telnyx Account
├── Outbound Voice Profile (e.g. "Default")
│   └── Controls: localization (US), spend limits, ringback
│
├── Credential Connection (e.g. "ensurance-webrtc")
│   ├── Uses the outbound voice profile for outbound calls
│   ├── Generates JWT tokens for browser-side TelnyxRTC SDK
│   └── Phone Number assigned here (e.g. +12029890958)
│       └── This number is the caller ID for outbound calls
│
└── AI Assistants (separate from WebRTC calling)
    ├── Created via POST /v2/ai/assistants
    ├── Each assistant gets its own ID
    └── Phone numbers assigned to assistants in agent_phone_numbers table
```

**Key insight**: The Credential Connection is for YOUR outbound calls (agent → lead). AI Assistants handle INBOUND calls (lead → AI). They use the same API key but different infrastructure.

---

## Setup Checklist

### 1. Credential Connection (for WebRTC outbound calling)

1. Go to **Telnyx Portal → Voice → SIP Connections**
2. Create a **Credential Connection** (not FQDN, not TeXML)
3. Name it something recognizable (e.g. `ensurance-webrtc`)
4. Under **Outbound**:
   - Set **Outbound Voice Profile** (use "Default" or create one)
   - Localization: United States
   - Enable **Instant Ringback** (callers hear ringing immediately)
5. Copy the **Connection ID** (long numeric string) → `TELNYX_CONNECTION_ID`

### 2. Phone Number Assignment

1. Go to **Telnyx Portal → Numbers → My Numbers**
2. Pick or purchase a local number
3. Set its **Connection** to your credential connection (e.g. `ensurance-webrtc`)
4. Copy the number in E.164 format → `TELNYX_CALLER_NUMBER`

**Important**: The number MUST be assigned to the same connection as `TELNYX_CONNECTION_ID`. If the number has `connection_id: none` in the API, outbound calls will fail.

### 3. Outbound Voice Profile

1. Go to **Telnyx Portal → Voice → Outbound Voice Profiles**
2. Either use "Default" or create a new one
3. Set **Localization** to the country you're calling (US)
4. Enable the profile
5. Assign it to your credential connection's outbound settings

---

## How the Token Flow Works

The Test Call button and lead Call button both use the same flow:

```
Browser clicks CALL
    ↓
POST /api/telnyx/token
    ↓
Server: POST https://api.telnyx.com/v2/telephony_credentials
  body: { connection_id: TELNYX_CONNECTION_ID }
  → returns credential ID (short-lived)
    ↓
Server: POST https://api.telnyx.com/v2/telephony_credentials/{id}/token
  → returns JWT string (short-lived)
    ↓
Response: { token, callerNumber, leadId }
    ↓
Browser: new TelnyxRTC({ login_token: token })
    ↓
client.connect() → wait for telnyx.ready
    ↓
client.newCall({ destinationNumber, callerNumber })
```

**No API key reaches the browser.** Only the short-lived JWT token.

---

## AI Assistants (Inbound Calls)

Separate from WebRTC calling. Created via `lib/telnyx/ai-config.ts`.

### Key Settings

| Setting | Value | Why |
|---------|-------|-----|
| `model` | `Qwen/Qwen3-235B-A22B` | Llama models output raw JSON as speech |
| `transcription.model` | `deepgram/flux` | Required for hangup tool (nova-2 breaks WebRTC with hangup) |
| `enabled_features` | `["telephony"]` | Required for phone/WebRTC calls |
| `telephony_settings.supports_unauthenticated_web_calls` | `true` | Required for browser test calls |
| `tools[].type: "hangup"` | Always included | Auto-ends call when caller says goodbye |
| `tools[].type: "webhook"` | Added when webhook URL exists | Saves caller info to CRM |

### Hangup Tool

```typescript
{
  type: "hangup",
  hangup: {
    description: "Use this to end the call when the user says goodbye or wants to end the conversation"
  }
}
```

**Critical**: The hangup tool requires `deepgram/flux` transcription model. Using `deepgram/nova-2` with hangup breaks WebRTC agents. This was discovered in the Growthly project and confirmed here.

### Updating Assistants

Telnyx uses **POST** (not PATCH) for assistant updates. The `tools` array is a **full overwrite** — send ALL tools or the missing ones get removed.

---

## Outbound Calling Capability

As of March 2026, outbound calling IS configured:

- Credential connection `ensurance-webrtc` has the "Default" outbound voice profile
- Outbound profile is enabled, US localization, instant ringback
- Caller number `+12029890958` is a local DC number assigned to the connection
- The Call button on lead detail pages and the Test Call button on agent pages both use this

---

## Troubleshooting

### "Telnyx credentials not configured"
The `/api/telnyx/token` endpoint requires ALL THREE env vars. Check:
```bash
grep -c '^TELNYX_API_KEY=' .env.local        # should be 1
grep -c '^TELNYX_CONNECTION_ID=' .env.local   # should be 1
grep -c '^TELNYX_CALLER_NUMBER=' .env.local   # should be 1
```

### Token creation fails (502)
- Verify `TELNYX_CONNECTION_ID` is a valid credential connection ID
- Check the connection is **active** in Telnyx Portal
- The connection must be a **Credential Connection** (not FQDN or TeXML)

### Call connects but no audio / immediately drops
- Check the phone number is assigned to the credential connection
- Check the outbound voice profile is enabled and assigned
- Check the number is active (`status: active` in API)

### Test Call doesn't ring the AI agent
- The Test Call dials the agent's phone number via WebRTC
- The agent's phone number must have the AI assistant assigned to it
- If the phone number has a different connection (not AI), the call goes there instead

### Verifying credentials via API (without exposing keys)
```bash
# Check API key works
node -e "
const key = require('fs').readFileSync('.env.local','utf8').match(/^TELNYX_API_KEY=(.+)$/m)?.[1];
fetch('https://api.telnyx.com/v2/phone_numbers?page[size]=1', {
  headers: { 'Authorization': 'Bearer ' + key }
}).then(r => console.log('API key:', r.ok ? 'OK' : 'FAILED (' + r.status + ')'));
"

# Check connection exists
node -e "
const fs = require('fs');
const env = fs.readFileSync('.env.local','utf8');
const key = env.match(/^TELNYX_API_KEY=(.+)$/m)?.[1];
const conn = env.match(/^TELNYX_CONNECTION_ID=(.+)$/m)?.[1];
fetch('https://api.telnyx.com/v2/credential_connections/' + conn, {
  headers: { 'Authorization': 'Bearer ' + key }
}).then(r => r.json()).then(d => {
  if (d.errors) console.log('Connection: INVALID');
  else console.log('Connection:', d.data.connection_name, '| active:', d.data.active);
});
"

# End-to-end token test
node -e "
const fs = require('fs');
const env = fs.readFileSync('.env.local','utf8');
const key = env.match(/^TELNYX_API_KEY=(.+)$/m)?.[1];
const conn = env.match(/^TELNYX_CONNECTION_ID=(.+)$/m)?.[1];
fetch('https://api.telnyx.com/v2/telephony_credentials', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ connection_id: conn })
}).then(r => r.json()).then(d => {
  if (d.errors) { console.log('Credential creation: FAILED', d.errors); return; }
  console.log('Credential creation: OK');
  return fetch('https://api.telnyx.com/v2/telephony_credentials/' + d.data.id + '/token', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  }).then(r => r.text()).then(t => console.log('JWT generation:', t.length > 50 ? 'OK' : 'FAILED'));
});
"
```

---

## Current Account Inventory (March 2026)

### Credential Connections
| ID | Name | Use |
|----|------|-----|
| 2900337137658365934 | ensurance-webrtc | Ensurance WebRTC calling |
| 2831608123955873302 | AI Master SIP | — |
| 2719321761815463386 | Forward Only | — |

### Relevant Phone Numbers
| Number | Connection | Use |
|--------|-----------|-----|
| +12029890958 | ensurance-webrtc | Ensurance caller ID (outbound) |
| +13465192040 | none | Ensurance (unassigned) |
| +19786441743 | none | Ensurance (unassigned, purchased Mar 2026) |

### Outbound Voice Profiles
| ID | Name | Enabled |
|----|------|---------|
| 2742419069771712373 | Default | Yes |
