"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Feature key map                                                    */
/* ------------------------------------------------------------------ */

export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  sms_messaging: "SMS Messaging",
  gmail_integration: "Gmail Integration",
  ai_voice_agents: "AI Voice Agents",
  lead_enrichment: "Lead Enrichment",
  pdf_proposals: "PDF Proposals",
  custom_lead_fields: "Custom Lead Fields",
  all_dashboard_widgets: "Dashboard Customization",
  team_management: "Team Management",
  team_data_view: "Team Data View",
  lead_assignment: "Lead Assignment",
} as const

/* ------------------------------------------------------------------ */
/*  Upgrade Prompt component                                           */
/* ------------------------------------------------------------------ */

interface UpgradePromptProps {
  feature: string
  className?: string
}

const TEAM_FEATURES = new Set(["team_management", "team_data_view", "lead_assignment"])

function requiredPlan(feature: string): string {
  return TEAM_FEATURES.has(feature) ? "Agency" : "Pro"
}

export function UpgradePrompt({ feature, className }: UpgradePromptProps) {
  const displayName = FEATURE_DISPLAY_NAMES[feature] ?? feature
  const plan = requiredPlan(feature)

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {displayName} requires the {plan} plan
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upgrade to unlock this feature and get access to all premium tools.
          </p>
        </div>
        <Button asChild size="sm" className="mt-1 cursor-pointer">
          <Link href="/pricing">View Plans</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline upgrade prompt (no card wrapper)                            */
/* ------------------------------------------------------------------ */

export function UpgradePromptInline({ feature, className }: UpgradePromptProps) {
  const displayName = FEATURE_DISPLAY_NAMES[feature] ?? feature
  const plan = requiredPlan(feature)

  return (
    <div className={`flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center ${className ?? ""}`}>
      <Lock className="h-5 w-5 text-muted-foreground/60" />
      <p className="text-[12px] font-medium text-muted-foreground">
        {displayName} requires the {plan} plan
      </p>
      <Link
        href="/pricing"
        className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
      >
        View Plans
      </Link>
    </div>
  )
}
