# Task: P4-04-commission-to-supabase

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code), Supabase MCP
- **Human Checkpoint**: None

## Depends On
- P4-01 (auth infrastructure) must be complete and committed
- Does NOT depend on P4-02 or P4-03. Can run in parallel.

## Description

Move commission settings from browser localStorage to a Supabase `agent_settings` table. Currently, if an agent sets up their commission rates on one computer, clears their cache, or logs in from another device, the rates are gone. This task makes them persist per-user in the database.

## Database Changes (via Supabase MCP)

### Create `agent_settings` table
```sql
CREATE TABLE agent_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  default_first_year_percent numeric NOT NULL DEFAULT 75,
  default_renewal_percent numeric NOT NULL DEFAULT 5,
  carrier_commissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One settings row per user
CREATE UNIQUE INDEX agent_settings_user_id_idx ON agent_settings (user_id);

-- RLS
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON agent_settings
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own settings" ON agent_settings
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own settings" ON agent_settings
  FOR UPDATE USING (user_id = auth.uid()::text);
```

### carrier_commissions JSONB format
```json
[
  { "carrierId": "foresters", "carrierName": "Foresters Financial", "firstYearPercent": 85, "renewalPercent": 7 },
  { "carrierId": "jh", "carrierName": "John Hancock", "firstYearPercent": 70, "renewalPercent": 5 }
]
```
Only carriers with custom (non-default) rates are stored. Carriers not in the array use the default percentages.

## Files to Create

### 1. `lib/supabase/settings.ts` (~60 lines)

Data access layer for agent settings:
```typescript
import { getServiceClient } from "./server"
import type { CommissionSettings, CarrierCommission } from "@/lib/types/commission"

export async function getAgentSettings(userId: string): Promise<CommissionSettings | null> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from("agent_settings")
    .select("*")
    .eq("user_id", userId)
    .single()
  
  if (!data) return null
  
  return {
    defaultFirstYearPercent: Number(data.default_first_year_percent),
    defaultRenewalPercent: Number(data.default_renewal_percent),
    commissions: (data.carrier_commissions as CarrierCommission[]) || [],
  }
}

export async function upsertAgentSettings(
  userId: string,
  settings: CommissionSettings
): Promise<void> {
  const supabase = getServiceClient()
  await supabase
    .from("agent_settings")
    .upsert({
      user_id: userId,
      default_first_year_percent: settings.defaultFirstYearPercent,
      default_renewal_percent: settings.defaultRenewalPercent,
      carrier_commissions: settings.commissions,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
}
```

### 2. `app/api/settings/route.ts` (~50 lines)

API endpoints for commission settings:
- **GET**: Fetch the current user's settings from Supabase. Returns defaults if no row exists.
- **PUT**: Save/update settings. Zod validation on the request body.
- Both require auth (via auth-guard or session cookies).

```typescript
// GET: return settings or defaults
// PUT: upsert settings with Zod validation
```

Zod schema for PUT:
```typescript
const settingsSchema = z.object({
  defaultFirstYearPercent: z.number().min(0).max(150),
  defaultRenewalPercent: z.number().min(0).max(25),
  commissions: z.array(z.object({
    carrierId: z.string(),
    carrierName: z.string(),
    firstYearPercent: z.number().min(0).max(150),
    renewalPercent: z.number().min(0).max(25),
  })),
})
```

## Files to Modify

### 3. `lib/store/commission-store.ts`

Major refactor:
- **Remove** the Zustand `persist` middleware (no more localStorage)
- **Add** `isLoaded: boolean` state field (tracks whether server data has been fetched)
- **Add** `loadFromServer()` async action:
  - GET /api/settings
  - If data exists, populate store
  - If no data (new user), keep defaults
  - Set `isLoaded = true`
- **Add** `saveToServer()` async action:
  - PUT /api/settings with current store state
  - Debounced (1000ms) — don't save on every keystroke
  - Fire-and-forget with toast on error
- **Keep** all existing synchronous actions (setCarrierCommission, etc.) for instant UI updates
- Each mutation calls `saveToServer()` after updating local state (optimistic updates)

### 4. `components/settings/commission-settings-client.tsx`

- On mount: call `loadFromServer()` from commission store
- Show skeleton/loading state while `isLoaded === false`
- Show save indicator: "Saved" / "Saving..." / "Error saving" based on save state
- Remove any localStorage migration UI (clean break)

### 5. Regenerate database types
- Run Supabase type generation to include the new `agent_settings` table
- Update `lib/types/database.generated.ts`
- Update `lib/types/database.ts` with hand-written types for the new table

## One-Time Migration: localStorage → Database

In the `loadFromServer()` function, add a migration path:

```typescript
async loadFromServer() {
  const res = await fetch("/api/settings")
  const serverSettings = await res.json()
  
  if (serverSettings && serverSettings.commissions?.length > 0) {
    // Server has data — use it
    this.applySettings(serverSettings)
  } else {
    // No server data — check localStorage for existing settings
    const localData = localStorage.getItem("ensurance-commission-settings")
    if (localData) {
      try {
        const parsed = JSON.parse(localData)
        this.applySettings(parsed.state) // Zustand persist format
        await this.saveToServer() // Migrate to server
        localStorage.removeItem("ensurance-commission-settings") // Clean up
      } catch { /* ignore corrupt localStorage */ }
    }
  }
  
  this.isLoaded = true
}
```

This ensures agents who already set rates in localStorage don't lose them.

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. `agent_settings` table exists in Supabase with RLS enabled
3. GET /api/settings returns default values for new users
4. PUT /api/settings persists commission rates
5. Settings page loads from server on mount (not localStorage)
6. Changing a rate saves to server (with debounce)
7. Settings persist across browsers/devices for the same logged-in user
8. localStorage migration works: existing rates transfer to server on first login
9. localStorage is cleaned up after migration
10. Commission values still appear correctly in quote results

## On Completion
- Update CLAUDE.md with new API route and table
- Regenerate database types
- Commit: `feat: migrate commission settings from localStorage to Supabase`
