"use client"

import { useAuth, useUser } from "@clerk/nextjs"
import { Info } from "lucide-react"

export function ProfileCompletionBanner() {
  const { orgId } = useAuth()
  const { user, isLoaded } = useUser()

  if (!isLoaded || !user || !orgId) return null

  const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>
  const hasLicensedState = typeof meta.licensed_state === "string" && meta.licensed_state.length > 0
  const hasLicenseNumber = typeof meta.license_number === "string" && meta.license_number.length > 0

  if (hasLicensedState && hasLicenseNumber) return null

  const missing: string[] = []
  if (!hasLicensedState) missing.push("licensed state")
  if (!hasLicenseNumber) missing.push("license number")

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <p className="text-sm text-blue-800 dark:text-blue-200">
        Complete your {missing.join(" and ")} so your team admin can assign leads in your licensed states.
      </p>
    </div>
  )
}
