"use client"

import { useAuth } from "@clerk/nextjs"

/**
 * Client-side feature gate hook.
 *
 * Uses Clerk's `has()` helper with a fail-open pattern:
 * - If `has` is undefined (billing not configured), returns true (allow).
 * - If `has` exists and returns false, returns false (block).
 * - If `has` exists and returns true, returns true (allow).
 */
export function useFeatureGate(feature: string): boolean {
  const { has } = useAuth()
  return has?.({ feature }) ?? true
}
