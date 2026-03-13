"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react"
import { PIPELINE_STAGES } from "@/lib/data/pipeline"

/* ------------------------------------------------------------------ */
/*  Chart configs                                                      */
/* ------------------------------------------------------------------ */

const activityConfig = {
  lead_created: { label: "Leads Created", color: "#8b5cf6" },
  call: { label: "Calls Made", color: "#1773cf" },
  quote: { label: "Quotes Run", color: "#14b8a6" },
} satisfies ChartConfig

const stageConfig = {
  new: { label: "New", color: "#60a5fa" },
  contacted: { label: "Contacted", color: "#fbbf24" },
  quoted: { label: "Quoted", color: "#a78bfa" },
  applied: { label: "Applied", color: "#fb923c" },
  issued: { label: "Issued", color: "#34d399" },
  dead: { label: "Dead", color: "#f87171" },
} satisfies ChartConfig

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WeeklyActivity {
  week: string
  lead_created: number
  call: number
  quote: number
}

interface ActivityResponse {
  readonly activity_type: string
  readonly week: string
  readonly count: number
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface DashboardChartsProps {
  byStatus: Record<string, number>
}

export function DashboardCharts({ byStatus }: DashboardChartsProps) {
  const [activityData, setActivityData] = useState<WeeklyActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  const loadActivityData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/activity-chart")
      if (!res.ok) return
      const data: ActivityResponse[] = await res.json()

      // Group by week
      const weekMap = new Map<string, WeeklyActivity>()
      for (const row of data) {
        const existing = weekMap.get(row.week) ?? {
          week: row.week,
          lead_created: 0,
          call: 0,
          quote: 0,
        }
        if (row.activity_type === "lead_created") {
          existing.lead_created = row.count
        } else if (row.activity_type === "call") {
          existing.call = row.count
        } else if (row.activity_type === "quote") {
          existing.quote = row.count
        }
        weekMap.set(row.week, existing)
      }

      // Sort by week ascending
      const sorted = Array.from(weekMap.values()).sort(
        (a, b) => a.week.localeCompare(b.week),
      )
      setActivityData(sorted)
    } catch {
      // keep empty
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadActivityData()
  }, [loadActivityData])

  // Build stage data from real byStatus counts
  const stageData = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      name: stage.label,
      value: byStatus[stage.value] ?? 0,
      fill: `var(--color-${stage.value})`,
    })).filter((s) => s.value > 0)
  }, [byStatus])

  const stageTotal = useMemo(
    () => stageData.reduce((sum, s) => sum + s.value, 0),
    [stageData],
  )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Activity Overview — Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <TrendingUp className="h-4 w-4 text-[#1773cf]" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex h-[280px] items-center justify-center">
              <p className="text-xs text-muted-foreground">Loading activity data…</p>
            </div>
          ) : activityData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center">
              <p className="text-xs text-muted-foreground">No activity data yet</p>
            </div>
          ) : (
            <ChartContainer config={activityConfig} className="h-[280px] w-full">
              <LineChart
                data={activityData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  fontSize={12}
                  width={36}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="lead_created"
                  stroke="var(--color-lead_created)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="call"
                  stroke="var(--color-call)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="quote"
                  stroke="var(--color-quote)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Leads by Stage — Donut Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <PieChartIcon className="h-4 w-4 text-[#1773cf]" />
            Leads by Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stageTotal === 0 ? (
            <div className="flex h-[280px] items-center justify-center">
              <p className="text-xs text-muted-foreground">No leads yet</p>
            </div>
          ) : (
            <ChartContainer config={stageConfig} className="h-[280px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={stageData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  strokeWidth={2}
                  stroke="var(--background)"
                >
                  {stageData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {stageTotal}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 22}
                              className="fill-muted-foreground text-xs"
                            >
                              Total Leads
                            </tspan>
                          </text>
                        )
                      }
                      return null
                    }}
                  />
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
