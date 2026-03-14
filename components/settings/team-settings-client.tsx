"use client"

import { OrganizationProfile, CreateOrganization, useAuth } from "@clerk/nextjs"
import { useState } from "react"
import { Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SettingsPageHeader } from "./settings-page-header"
import { useFeatureGate } from "@/lib/billing/use-feature-gate"
import { UpgradePrompt } from "@/lib/billing/feature-gate"

export function TeamSettingsClient() {
  const { orgId, isLoaded } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const hasTeamManagement = useFeatureGate("team_management")

  if (!isLoaded) {
    return (
      <div>
        <SettingsPageHeader
          title="Team Management"
          description="Manage your team members, roles, and permissions."
        />
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </div>
    )
  }

  // User has an org — show Clerk's OrganizationProfile (gated behind team_management)
  if (orgId) {
    return (
      <div>
        <SettingsPageHeader
          title="Team Management"
          description="Manage your team members, roles, and permissions."
        />
        {hasTeamManagement ? (
          <OrganizationProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "w-full shadow-none border border-border rounded-lg",
              },
            }}
          />
        ) : (
          <UpgradePrompt feature="team_management" />
        )}
      </div>
    )
  }

  // User wants to create an org
  if (showCreate) {
    return (
      <div>
        <SettingsPageHeader
          title="Create Your Team"
          description="Set up an organization to collaborate with your team."
        />
        <CreateOrganization
          routing="hash"
          afterCreateOrganizationUrl="/settings/team"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full shadow-none border border-border rounded-lg",
            },
          }}
        />
      </div>
    )
  }

  // No org — show CTA to create one
  return (
    <div>
      <SettingsPageHeader
        title="Team Management"
        description="Manage your team members, roles, and permissions."
      />
      <Card>
        <CardHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eff6ff] dark:bg-[#1773cf]/15">
            <Users className="h-6 w-6 text-[#1773cf]" />
          </div>
          <CardTitle className="text-base">Work with a Team</CardTitle>
          <CardDescription>
            Create an organization to invite team members, share leads, and
            collaborate on your insurance business.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <ul className="max-w-sm space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1773cf]" />
              Invite agents and manage roles
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1773cf]" />
              Shared lead visibility across the team
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1773cf]" />
              Team-wide activity and performance dashboards
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1773cf]" />
              Role-based permissions (admin, member)
            </li>
          </ul>
          <Button
            onClick={() => setShowCreate(true)}
            className="mt-2 gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
