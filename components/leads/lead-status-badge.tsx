"use client"

import { Badge } from "@/components/ui/badge"
import type { LeadStatus } from "@/lib/types/lead"

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  contacted: {
    label: "Contacted",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  quoted: {
    label: "Quoted",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  applied: {
    label: "Applied",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  },
  issued: {
    label: "Issued",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
}

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "quoted",
  "applied",
  "issued",
  "closed",
]

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  )
}

export function getStatusLabel(status: LeadStatus): string {
  return STATUS_CONFIG[status].label
}
