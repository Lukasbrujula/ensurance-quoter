"use client"

import { useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database.generated"

/**
 * Browser-side Supabase client authenticated via Clerk JWT.
 * Uses a custom fetch wrapper to attach a fresh Clerk token on every request.
 * Must be called inside a React component (it's a hook).
 *
 * Replaces createAuthBrowserClient() from auth-client.ts.
 */
export function useClerkSupabase() {
  const { getToken } = useAuth()

  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }

    return createClient<Database>(url, anonKey, {
      global: {
        fetch: async (input, init = {}) => {
          const clerkToken = await getToken()
          const headers = new Headers(init?.headers)
          headers.set("Authorization", `Bearer ${clerkToken}`)
          return fetch(input, { ...init, headers })
        },
      },
    })
  }, [getToken])
}
