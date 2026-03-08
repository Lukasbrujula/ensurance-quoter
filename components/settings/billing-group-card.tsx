"use client"

import { useState, useEffect, useCallback } from "react"
import { Receipt, Check, AlertTriangle, Loader2, RefreshCw } from "lucide-react"
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

interface BillingGroupStatus {
  status: "active" | "provisioning" | "not_configured"
  billingGroupId: string | null
  name: string | null
  createdAt: string | null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BillingGroupCard() {
  const [status, setStatus] = useState<BillingGroupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/billing-group")
      if (!res.ok) {
        setStatus({ status: "not_configured", billingGroupId: null, name: null, createdAt: null })
        return
      }
      const data: BillingGroupStatus = await res.json()
      setStatus(data)
    } catch {
      setStatus({ status: "not_configured", billingGroupId: null, name: null, createdAt: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const res = await fetch("/api/settings/billing-group")
      if (!res.ok) throw new Error("Failed to provision")
      const data: BillingGroupStatus = await res.json()
      setStatus(data)
      if (data.status === "active") {
        toast.success("Billing group provisioned")
      } else {
        toast.error("Billing group provisioning failed — try again later")
      }
    } catch {
      toast.error("Failed to provision billing group")
    } finally {
      setRetrying(false)
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

  const isActive = status?.status === "active"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Telnyx Billing Group</CardTitle>
              <CardDescription>
                {isActive
                  ? status?.name ?? "Billing group active"
                  : "Tracks telephony costs for your account — calls, SMS, and phone numbers."}
              </CardDescription>
            </div>
          </div>

          {isActive ? (
            <Badge
              variant="secondary"
              className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              <Check className="h-3 w-3" />
              Active
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              <AlertTriangle className="h-3 w-3" />
              Not Provisioned
            </Badge>
          )}
        </div>
      </CardHeader>
      {!isActive && (
        <CardContent>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Auto-provisioning failed. Click retry to create your billing group.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => void handleRetry()}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Retry
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
