"use client"

import { useState, useCallback, useEffect } from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { UserCircle, Users, Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useFeatureGate } from "@/lib/billing/use-feature-gate"

interface OrgMember {
  userId: string
  name: string
  imageUrl: string | null
  role: string | null
}

interface LeadAssignmentDropdownProps {
  leadId: string
  currentAgentId: string | null
  onReassigned: (newAgentId: string | null) => void
}

/**
 * Assignment dropdown for lead detail page.
 * Only renders when:
 * - User has an active org (orgId present)
 * - User is an org admin (orgRole === 'org:admin')
 * - The lead belongs to the same org (has orgId)
 *
 * Solo agents and non-admin org members see nothing.
 */
export function LeadAssignmentDropdown({
  leadId,
  currentAgentId,
  onReassigned,
}: LeadAssignmentDropdownProps) {
  const { orgId, orgRole } = useAuth()
  const { memberships } = useOrganization({
    memberships: { pageSize: 100 },
  })
  const hasLeadAssignment = useFeatureGate("lead_assignment")

  const [isReassigning, setIsReassigning] = useState(false)
  const [members, setMembers] = useState<OrgMember[]>([])

  // Build member list from Clerk memberships
  useEffect(() => {
    if (!memberships?.data) return

    const mapped: OrgMember[] = memberships.data.map((m) => ({
      userId: m.publicUserData?.userId ?? "",
      name: [m.publicUserData?.firstName, m.publicUserData?.lastName]
        .filter(Boolean)
        .join(" ") || m.publicUserData?.identifier || "Unknown",
      imageUrl: m.publicUserData?.imageUrl ?? null,
      role: m.role,
    })).filter((m) => m.userId)

    setMembers(mapped)
  }, [memberships?.data])

  // Don't render for solo agents, non-admins, or without lead_assignment feature
  if (!orgId || orgRole !== "org:admin" || !hasLeadAssignment) return null

  const handleReassign = useCallback(
    async (value: string) => {
      const newAgentId = value === "unassigned" ? null : value
      if (newAgentId === currentAgentId) return

      setIsReassigning(true)
      try {
        const res = await fetch("/api/leads/reassign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, newAgentId }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Failed to reassign lead")
        }

        onReassigned(newAgentId)

        const memberName = newAgentId
          ? members.find((m) => m.userId === newAgentId)?.name ?? "agent"
          : null

        toast.success(
          newAgentId
            ? `Lead reassigned to ${memberName}`
            : "Lead moved to unassigned pool"
        )
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reassign lead"
        )
      } finally {
        setIsReassigning(false)
      }
    },
    [leadId, currentAgentId, members, onReassigned]
  )

  const currentMember = members.find((m) => m.userId === currentAgentId)
  const displayValue = currentAgentId ? currentAgentId : "unassigned"

  return (
    <div className="flex items-center gap-1.5">
      <Users className="h-3 w-3 text-[#94a3b8]" />
      <Select
        value={displayValue}
        onValueChange={handleReassign}
        disabled={isReassigning}
      >
        <SelectTrigger className="h-7 w-auto min-w-[120px] gap-1 border-0 bg-transparent px-1 text-[12px] shadow-none focus:ring-0">
          {isReassigning ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Reassigning...
            </span>
          ) : (
            <SelectValue>
              {currentMember ? (
                <span className="flex items-center gap-1">
                  <UserCircle className="h-3.5 w-3.5 text-[#64748b]" />
                  {currentMember.name}
                </span>
              ) : (
                <span className="text-[#94a3b8]">Unassigned</span>
              )}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <span className="text-[#94a3b8]">Unassigned (Lead Pool)</span>
          </SelectItem>
          {members.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              <span className="flex items-center gap-1.5">
                <UserCircle className="h-3.5 w-3.5 text-[#64748b]" />
                {member.name}
                {member.role === "org:admin" && (
                  <span className="text-[10px] text-[#94a3b8]">(Admin)</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
