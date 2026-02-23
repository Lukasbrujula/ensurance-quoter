"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Calendar, Check, Loader2, Unplug } from "lucide-react"
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GoogleStatus {
  connected: boolean
  email: string | null
  configured: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GoogleCalendarCard() {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const searchParams = useSearchParams()

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status")
      if (!res.ok) {
        setStatus({ connected: false, email: null, configured: false })
        return
      }
      const data: GoogleStatus = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, email: null, configured: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  // Handle query param toasts from OAuth callback
  useEffect(() => {
    const googleParam = searchParams.get("google")
    if (!googleParam) return

    if (googleParam === "connected") {
      toast.success("Google Calendar connected")
    } else if (googleParam === "error") {
      toast.error("Failed to connect Google Calendar")
    } else if (googleParam === "cancelled") {
      toast.info("Google Calendar connection cancelled")
    }

    // Clean up URL params
    const url = new URL(window.location.href)
    url.searchParams.delete("google")
    window.history.replaceState({}, "", url.pathname)
  }, [searchParams])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/auth/google/disconnect", { method: "POST" })
      if (!res.ok) throw new Error("Disconnect failed")
      setStatus({ connected: false, email: null, configured: status?.configured ?? false })
      toast.success("Google Calendar disconnected")
    } catch {
      toast.error("Failed to disconnect Google Calendar")
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

  const isConnected = status?.connected ?? false
  const isConfigured = status?.configured ?? false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <CardDescription>
                {isConnected
                  ? `Connected as ${status?.email ?? "unknown"}`
                  : "Sync follow-ups and AI callbacks with your Google Calendar."}
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
              Syncing to: Primary calendar
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDisconnect}
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
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!isConfigured}
            onClick={() => {
              window.location.href = "/api/auth/google"
            }}
            title={
              isConfigured
                ? "Connect your Google Calendar"
                : "Google Calendar not configured on this server"
            }
          >
            <Calendar className="h-3.5 w-3.5" />
            Connect Google Calendar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
