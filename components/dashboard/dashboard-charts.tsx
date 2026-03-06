"use client"

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

/* ------------------------------------------------------------------ */
/*  Mock data — replace with real API data later                       */
/* ------------------------------------------------------------------ */

const ACTIVITY_DATA = [
  { month: "Oct", newLeads: 18, callsMade: 24, quotesRun: 12 },
  { month: "Nov", newLeads: 25, callsMade: 31, quotesRun: 19 },
  { month: "Dec", newLeads: 14, callsMade: 18, quotesRun: 10 },
  { month: "Jan", newLeads: 32, callsMade: 42, quotesRun: 27 },
  { month: "Feb", newLeads: 28, callsMade: 36, quotesRun: 22 },
  { month: "Mar", newLeads: 35, callsMade: 48, quotesRun: 30 },
]

const STAGE_DATA = [
  { name: "New", value: 42, fill: "var(--color-new)" },
  { name: "Contacted", value: 28, fill: "var(--color-contacted)" },
  { name: "Quoted", value: 15, fill: "var(--color-quoted)" },
  { name: "Closed", value: 8, fill: "var(--color-closed)" },
  { name: "Lost", value: 7, fill: "var(--color-lost)" },
]

const STAGE_TOTAL = STAGE_DATA.reduce((sum, s) => sum + s.value, 0)

/* ------------------------------------------------------------------ */
/*  Chart configs                                                      */
/* ------------------------------------------------------------------ */

const activityConfig = {
  newLeads: { label: "New Leads", color: "#8b5cf6" },
  callsMade: { label: "Calls Made", color: "#1773cf" },
  quotesRun: { label: "Quotes Run", color: "#14b8a6" },
} satisfies ChartConfig

const stageConfig = {
  new: { label: "New", color: "#60a5fa" },
  contacted: { label: "Contacted", color: "#fbbf24" },
  quoted: { label: "Quoted", color: "#a78bfa" },
  closed: { label: "Closed", color: "#34d399" },
  lost: { label: "Lost", color: "#f87171" },
} satisfies ChartConfig

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardCharts() {
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
          <ChartContainer config={activityConfig} className="h-[280px] w-full">
            <LineChart
              data={ACTIVITY_DATA}
              margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
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
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="newLeads"
                stroke="var(--color-newLeads)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="callsMade"
                stroke="var(--color-callsMade)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="quotesRun"
                stroke="var(--color-quotesRun)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
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
          <ChartContainer config={stageConfig} className="h-[280px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={STAGE_DATA}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={110}
                strokeWidth={2}
                stroke="var(--background)"
              >
                {STAGE_DATA.map((entry) => (
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
                            {STAGE_TOTAL}
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
        </CardContent>
      </Card>
    </div>
  )
}
