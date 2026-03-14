"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { Users, Zap, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_PREFIX = "ensurance-welcome-dismissed-"

function getDismissalKey(orgId: string): string {
  return `${STORAGE_PREFIX}${orgId}`
}

export function TeamWelcomeCard() {
  const { orgId } = useAuth()
  const { organization } = useOrganization()
  const [dismissed, setDismissed] = useState(true) // default hidden to avoid flash

  useEffect(() => {
    if (!orgId) return
    const isDismissed = localStorage.getItem(getDismissalKey(orgId)) === "true"
    setDismissed(isDismissed)
  }, [orgId])

  if (!orgId || dismissed) return null

  const orgName = organization?.name ?? "your team"

  function handleDismiss() {
    if (!orgId) return
    localStorage.setItem(getDismissalKey(orgId), "true")
    setDismissed(true)
  }

  return (
    <div className="relative mx-4 mb-4 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-5 dark:from-blue-950/30 dark:to-indigo-950/30 sm:mx-6 lg:mx-8">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded p-1 text-muted-foreground/60 transition-colors hover:bg-white/60 hover:text-muted-foreground dark:hover:bg-white/10"
        aria-label="Dismiss welcome card"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            Welcome to {orgName}!
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            You&apos;re part of the team. Here are a few things to get started:
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="default" onClick={handleDismiss}>
              <Link href="/leads">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Add your first lead
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" onClick={handleDismiss}>
              <Link href="/quote">
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Run a quote
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" onClick={handleDismiss}>
              <Link href="/settings/profile">
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Check your settings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
