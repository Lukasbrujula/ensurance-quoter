"use client"

import type { ReactNode } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

interface SortableWidgetProps {
  id: string
  children: ReactNode
}

export function SortableWidget({ id, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? "z-30 opacity-80" : ""}`}
    >
      <button
        type="button"
        className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 ${
          isDragging ? "cursor-grabbing opacity-100" : "cursor-grab hover:bg-accent hover:text-foreground"
        }`}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-primary/20" />
      )}
      {children}
    </div>
  )
}
