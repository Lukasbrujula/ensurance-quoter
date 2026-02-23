"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackToQuoterProps {
  /** Link text */
  label?: string
  /** Override destination (default: /quote) */
  href?: string
  /** Additional CSS classes */
  className?: string
}

export function BackToQuoter({
  label = "Back to Quotes",
  href = "/quote",
  className,
}: BackToQuoterProps) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}
