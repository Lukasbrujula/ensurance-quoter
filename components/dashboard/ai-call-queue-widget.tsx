"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Bot, Phone, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface AiCallItem {
  id: string
  callerName: string
  callerNumber: string | null
  reason: string | null
  status: string | null
  createdAt: string
  leadId: string | null
}

export function AiCallQueueWidget() {
  const [calls, setCalls] = useState<AiCallItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch("/api/dashboard/widgets")
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setCalls(json.aiCallQueue ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-xs text-muted-foreground">Unable to load</p>
          <Button variant="ghost" size="sm" className="mt-2 h-7" onClick={load}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <Bot className="h-4 w-4 text-[#1773cf]" />
            AI Call Queue
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
            <Link href="/agents">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">
              No recent AI calls
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[200px] min-h-[80px]">
            <div className="space-y-1">
              {calls.map((call) => (
                <CallRow key={call.id} call={call} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function CallRow({ call }: { call: AiCallItem }) {
  const href = call.leadId ? `/leads/${call.leadId}` : "/agents"

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50">
        <Phone className="h-3.5 w-3.5 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium">{call.callerName}</p>
          {call.status && (
            <Badge
              variant={call.status === "completed" ? "secondary" : "outline"}
              className="h-4 px-1 text-[9px]"
            >
              {call.status}
            </Badge>
          )}
        </div>
        {call.reason && (
          <p className="truncate text-[11px] text-muted-foreground">
            {call.reason}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
        </p>
      </div>
    </Link>
  )
}
