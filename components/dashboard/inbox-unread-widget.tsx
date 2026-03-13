"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Mail, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface InboxData {
  smsUnread: number
  emailUnread: number
  total: number
}

export function InboxUnreadWidget() {
  const router = useRouter()
  const [data, setData] = useState<InboxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch("/api/dashboard/widgets")
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setData(json.inbox)
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
        <CardContent className="pt-6">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="mb-1 h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
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
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push("/inbox")}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Inbox Unread
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{data.total}</p>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {data.smsUnread} SMS
              </span>
              <span className="flex items-center gap-0.5">
                <Mail className="h-3 w-3" />
                {data.emailUnread} email
              </span>
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff]">
            <MessageSquare className="h-5 w-5 text-[#1773cf]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
