"use client"

import { Phone, Moon, CalendarPlus, HelpCircle, Plus } from "lucide-react"
import {
  AGENT_TEMPLATES,
  type AgentTemplate,
} from "@/lib/telnyx/agent-templates"

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP = {
  Phone,
  Moon,
  CalendarPlus,
  HelpCircle,
} as const

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PurposeStepProps {
  onSelectTemplate: (template: AgentTemplate) => void
  onStartFromScratch: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PurposeStep({
  onSelectTemplate,
  onStartFromScratch,
}: PurposeStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          What should this agent handle?
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick a template to get started, or build your own from scratch.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {AGENT_TEMPLATES.map((template) => {
          const Icon = ICON_MAP[template.icon]
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              className="flex flex-col items-start gap-2 rounded-lg border-2 border-muted p-4 text-left transition-colors hover:border-[#1773cf] hover:bg-[#eff6ff]/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eff6ff]">
                <Icon className="h-4 w-4 text-[#1773cf]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  {template.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onStartFromScratch}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-[#64748b] hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Start from scratch
      </button>
    </div>
  )
}
