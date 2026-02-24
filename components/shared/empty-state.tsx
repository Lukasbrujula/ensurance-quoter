import Link from "next/link"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  EmptyState — reusable empty state component                        */
/* ------------------------------------------------------------------ */

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  /** Compact mode for panels — smaller icon, tighter spacing */
  compact?: boolean
  /** Optional children rendered below description (for custom action buttons) */
  children?: React.ReactNode
}

function ActionButton({ action, variant = "default" }: { action: EmptyStateAction; variant?: "default" | "outline" }) {
  if (action.href) {
    return (
      <Button asChild variant={variant} size="sm">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    )
  }
  return (
    <Button variant={variant} size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? "py-6 px-4" : "py-16 px-6"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-muted ${
          compact ? "h-10 w-10 mb-3" : "h-14 w-14 mb-4"
        }`}
      >
        <div className={compact ? "[&>svg]:h-5 [&>svg]:w-5" : "[&>svg]:h-6 [&>svg]:w-6"}>
          {icon}
        </div>
      </div>

      <h3
        className={`font-medium ${
          compact ? "text-[13px]" : "text-base"
        }`}
      >
        {title}
      </h3>

      <p
        className={`mt-1 max-w-xs text-muted-foreground ${
          compact ? "text-[11px]" : "text-sm"
        }`}
      >
        {description}
      </p>

      {(action || secondaryAction || children) && (
        <div className={`flex items-center gap-2 ${compact ? "mt-3" : "mt-5"}`}>
          {action && <ActionButton action={action} />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="outline" />}
          {children}
        </div>
      )}
    </div>
  )
}
