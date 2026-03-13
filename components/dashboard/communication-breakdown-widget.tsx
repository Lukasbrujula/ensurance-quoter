"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"

interface BreakdownData {
  calls: number
  sms: number
  email: number
}

const COLORS = ["#6366f1", "#14b8a6", "#f59e0b"]
const LABELS = ["Calls", "SMS", "Email"]

export function CommunicationBreakdownWidget() {
  const [data, setData] = useState<BreakdownData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch("/api/dashboard/widgets")
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setData(json.communicationBreakdown)
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
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-[180px] w-[180px] rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
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

  const total = data.calls + data.sms + data.email

  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wide">
            Communication Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-[13px] text-muted-foreground">
              No communications this month
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = [
    { name: "Calls", value: data.calls },
    { name: "SMS", value: data.sms },
    { name: "Email", value: data.email },
  ].filter((d) => d.value > 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wide">
          Communication Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((entry) => {
                const idx = LABELS.indexOf(entry.name)
                return (
                  <Cell
                    key={entry.name}
                    fill={COLORS[idx >= 0 ? idx : 0]}
                  />
                )
              })}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string, entry) => {
                const item = chartData.find((d) => d.name === value)
                return `${value}: ${item?.value ?? 0}`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
