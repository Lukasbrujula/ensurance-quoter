import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database.generated"

/** Supabase client type for optional dependency injection in data layer functions. */
export type DbClient = SupabaseClient<Database>

/**
 * SECURITY: Service role client — bypasses ALL RLS policies.
 * Only use where no user session is available:
 * - Webhook handlers (Telnyx, external services)
 * - Internal server-to-server API calls
 * - Background processing / cron jobs
 *
 * For authenticated contexts, use createClerkSupabaseClient() from clerk-client.ts instead.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  return createSupabaseClient<Database>(url, key)
}
