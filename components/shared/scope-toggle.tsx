"use client"

import { useAuth } from "@clerk/nextjs"
import { User, Users } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFeatureGate } from "@/lib/billing/use-feature-gate"

export type Scope = "personal" | "team"

interface ScopeToggleProps {
  scope: Scope
  onScopeChange: (scope: Scope) => void
}

/**
 * "My Data" / "Team" toggle for multi-tenant pages.
 * Only renders for org ADMINS with the team_data_view feature enabled.
 * Regular org members and solo agents see nothing — zero DOM output.
 */
export function ScopeToggle({ scope, onScopeChange }: ScopeToggleProps) {
  const { orgId, orgRole } = useAuth()
  const hasTeamDataView = useFeatureGate("team_data_view")

  if (!orgId || orgRole !== "org:admin" || !hasTeamDataView) return null

  return (
    <ToggleGroup
      type="single"
      value={scope}
      onValueChange={(value) => {
        if (value) onScopeChange(value as Scope)
      }}
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem value="personal" aria-label="My Data">
        <User className="mr-1.5 h-3.5 w-3.5" />
        My Data
      </ToggleGroupItem>
      <ToggleGroupItem value="team" aria-label="Team">
        <Users className="mr-1.5 h-3.5 w-3.5" />
        Team
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/**
 * Returns the default scope based on org role.
 * Owners/admins default to 'team', agents default to 'personal'.
 */
export function getDefaultScope(orgId: string | null | undefined, orgRole: string | null | undefined): Scope {
  if (!orgId) return "personal"
  return orgRole === "org:admin" ? "team" : "personal"
}
