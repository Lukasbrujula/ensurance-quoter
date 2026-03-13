"use client"

import type { ReactNode } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

interface SortableWidgetProps {
  id: string
  label: string
  children: ReactNode
}

export function SortableWidget({ id, label, children }: SortableWidgetProps) {
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
      className={`group/section rounded-lg transition-shadow ${
        isDragging
          ? "z-30 opacity-90 shadow-lg ring-1 ring-primary/10"
          : ""
      }`}
    >
      {/* Drag handle bar — full width, top of section */}
      <div
        className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 transition-colors ${
          isDragging
            ? "cursor-grabbing bg-muted/60"
            : "cursor-grab hover:bg-muted/50"
        }`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-hover/section:text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 transition-colors group-hover/section:text-muted-foreground">
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}
