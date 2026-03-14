"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Check, Loader2, Mail, Unplug } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useFeatureGate } from "@/lib/billing/use-feature-gate"
import { UpgradePromptInline } from "@/lib/billing/feature-gate"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GmailStatus {
  gmailConnected: boolean
  googleConnected: boolean
  email: string | null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GmailCard() {
  const canUseGmail = useFeatureGate("gmail_integration")
  const { user } = useUser()
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/email/status")
      if (!res.ok) {
        setStatus({ gmailConnected: false, googleConnected: false, email: null })
        return
      }
      const data: GmailStatus = await res.json()
      setStatus(data)
    } catch {
      setStatus({ gmailConnected: false, googleConnected: false, email: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/email/disconnect", { method: "POST" })
      if (!res.ok) throw new Error("Disconnect failed")
      setStatus((prev) => ({
        gmailConnected: false,
        googleConnected: prev?.googleConnected ?? false,
        email: prev?.email ?? null,
      }))
      toast.success("Gmail disconnected")
    } catch {
      toast.error("Failed to disconnect Gmail")
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const isConnected = status?.gmailConnected ?? false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <Mail className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-base">Gmail</CardTitle>
              <CardDescription>
                {isConnected
                  ? `Connected as ${status?.email ?? user?.primaryEmailAddress?.emailAddress ?? "your account"}`
                  : "Send and receive email from your Gmail account directly in the inbox."}
              </CardDescription>
            </div>
          </div>

          {isConnected ? (
            <Badge
              variant="secondary"
              className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              <Check className="h-3 w-3" />
              Connected
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Emails synced from your Gmail inbox
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unplug className="h-3.5 w-3.5" />
              )}
              Disconnect
            </Button>
          </div>
        ) : !canUseGmail ? (
          <UpgradePromptInline feature="gmail_integration" />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              window.location.href = "/api/auth/google?service=gmail&returnTo=/settings/integrations"
            }}
          >
            <Mail className="h-3.5 w-3.5" />
            Connect Gmail
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
