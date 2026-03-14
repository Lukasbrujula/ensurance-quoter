"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import type { OrgMember } from "@/app/api/org/members/route"

interface OrgMembersResult {
  /** Map of userId → member data. Empty when no org or still loading. */
  members: Record<string, OrgMember>
  /** Whether the fetch is in progress */
  isLoading: boolean
  /** Get display name for an agent. Returns null if not found. */
  getMemberName: (agentId: string | null) => string | null
  /** Get member data for an agent. Returns null if not found. */
  getMember: (agentId: string | null) => OrgMember | null
}

/**
 * Fetches and caches org members for the active Clerk organization.
 * Returns null-like defaults when no orgId (solo mode).
 * Caches by orgId — won't refetch on every page nav.
 */

// Module-level cache: orgId → members map
const memberCache = new Map<string, Record<string, OrgMember>>()

export function useOrgMembers(): OrgMembersResult {
  const { orgId } = useAuth()
  const [members, setMembers] = useState<Record<string, OrgMember>>(() =>
    orgId ? (memberCache.get(orgId) ?? {}) : {},
  )
  const [isLoading, setIsLoading] = useState(false)
  const fetchedOrgRef = useRef<string | null>(null)

  useEffect(() => {
    if (!orgId) {
      setMembers({})
      return
    }

    // Already fetched for this org (cache hit)
    if (memberCache.has(orgId)) {
      setMembers(memberCache.get(orgId)!)
      return
    }

    // Already fetching for this org in this component instance
    if (fetchedOrgRef.current === orgId) return
    fetchedOrgRef.current = orgId

    setIsLoading(true)
    void fetch("/api/org/members")
      .then((r) => r.json())
      .then((data: { success: boolean; data?: Record<string, OrgMember> }) => {
        if (data.success && data.data) {
          memberCache.set(orgId, data.data)
          setMembers(data.data)
        }
      })
      .catch(() => {
        // Non-critical — agent names just won't display
      })
      .finally(() => setIsLoading(false))
  }, [orgId])

  const getMemberName = useCallback(
    (agentId: string | null): string | null => {
      if (!agentId) return null
      const member = members[agentId]
      if (!member) return null
      const parts = [member.firstName, member.lastName].filter(Boolean)
      if (parts.length === 0) return null
      // First name + last initial: "Sarah J."
      if (member.lastName) {
        return `${member.firstName ?? ""} ${member.lastName.charAt(0)}.`.trim()
      }
      return parts.join(" ")
    },
    [members],
  )

  const getMember = useCallback(
    (agentId: string | null): OrgMember | null => {
      if (!agentId) return null
      return members[agentId] ?? null
    },
    [members],
  )

  return { members, isLoading, getMemberName, getMember }
}
