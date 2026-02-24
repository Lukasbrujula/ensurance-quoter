"use client"

import {
  Shield,
  Lock,
  Database,
  Eye,
  KeyRound,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SettingsPageHeader } from "./settings-page-header"

/* ------------------------------------------------------------------ */
/*  Security feature cards                                              */
/* ------------------------------------------------------------------ */

const SECURITY_FEATURES = [
  {
    icon: Lock,
    title: "Encryption in Transit",
    description:
      "All data between your browser and our servers is encrypted with TLS 1.3. API calls, form submissions, and file uploads never travel in plaintext.",
    status: "Active",
  },
  {
    icon: Database,
    title: "Encryption at Rest",
    description:
      "Your database is hosted on Supabase with AES-256 encryption at rest. Backups are encrypted and stored in a separate region.",
    status: "Active",
  },
  {
    icon: Eye,
    title: "Row-Level Security (RLS)",
    description:
      "Every database table has Row-Level Security policies. Your leads, quotes, call logs, and notes are only visible to your account — even if someone gains raw database access.",
    status: "Active",
  },
  {
    icon: KeyRound,
    title: "Session & Password Security",
    description:
      "Sessions use secure, httpOnly cookies with SameSite protection. Passwords require 10+ characters with uppercase, lowercase, number, and special character (GLBA-compliant).",
    status: "Active",
  },
  {
    icon: Shield,
    title: "CSRF & Rate Limiting",
    description:
      "All mutating API requests are validated against Origin/Referer headers. Distributed rate limiting (Upstash Redis) protects against brute-force and abuse across 5 tiers.",
    status: "Active",
  },
] as const

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SecuritySettingsSection() {
  return (
    <div>
      <SettingsPageHeader
        title="Security"
        description="Your account and data are protected by multiple layers of security."
      />

      <div className="space-y-4">
        {SECURITY_FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <Card key={feature.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Icon className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-sm">{feature.title}</CardTitle>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    {feature.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-[13px] leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          Ensurance follows GLBA-appropriate security practices for financial services software.
          If you have security concerns, contact support.
        </p>
      </div>
    </div>
  )
}
