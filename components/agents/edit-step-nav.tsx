"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

const EDIT_STEPS = [
  { path: "/agents/setup", label: "Business Setup" },
  { path: "/agents/personality", label: "Personality & Voice" },
  { path: "/agents/collect", label: "Collection Fields" },
] as const

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface EditStepNavProps {
  /** Current step path (e.g. "/agents/setup") */
  currentPath: string
  /** Agent ID for query param */
  agentId: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EditStepNav({ currentPath, agentId }: EditStepNavProps) {
  const currentIndex = EDIT_STEPS.findIndex((s) => s.path === currentPath)
  if (currentIndex === -1) return null

  const prev = currentIndex > 0 ? EDIT_STEPS[currentIndex - 1] : null
  const next =
    currentIndex < EDIT_STEPS.length - 1
      ? EDIT_STEPS[currentIndex + 1]
      : null

  return (
    <div className="flex items-center justify-between">
      {prev ? (
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`${prev.path}?id=${agentId}`}>
            <ArrowLeft className="h-4 w-4" />
            {prev.label}
          </Link>
        </Button>
      ) : (
        <div />
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {EDIT_STEPS.map((step, idx) => (
          <div
            key={step.path}
            className={`h-1.5 w-6 rounded-full transition-colors ${
              idx === currentIndex
                ? "bg-primary"
                : idx < currentIndex
                  ? "bg-primary/30"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>

      {next ? (
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`${next.path}?id=${agentId}`}>
            {next.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`/agents/${agentId}`}>
            Done
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}
