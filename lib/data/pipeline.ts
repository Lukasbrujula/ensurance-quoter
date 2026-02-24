/* ------------------------------------------------------------------ */
/*  Pipeline stages — single source of truth for lead status values    */
/* ------------------------------------------------------------------ */

export const PIPELINE_STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "quoted", label: "Quoted", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "applied", label: "Applied", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "issued", label: "Issued", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "dead", label: "Dead", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
] as const

export type PipelineStatus = (typeof PIPELINE_STAGES)[number]["value"]

export const STATUS_ORDER: PipelineStatus[] = [
  "new",
  "contacted",
  "quoted",
  "applied",
  "issued",
  "dead",
]

/**
 * Returns true if the suggested status is a forward move from current.
 * Never suggests 'dead' (that's always manual).
 */
export function shouldSuggestStatus(
  current: PipelineStatus,
  suggested: PipelineStatus,
): boolean {
  if (suggested === "dead") return false
  const currentIdx = STATUS_ORDER.indexOf(current)
  const suggestedIdx = STATUS_ORDER.indexOf(suggested)
  return suggestedIdx > currentIdx
}
