"use client"

import { Phone, CalendarPlus, HelpCircle } from "lucide-react"
import {
  AGENT_TEMPLATES,
  type AgentTemplate,
} from "@/lib/telnyx/agent-templates"

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP = {
  Phone,
  CalendarPlus,
  HelpCircle,
} as const

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PurposeStepProps {
  onSelectTemplate: (template: AgentTemplate) => void
  selectedTemplateId: string | null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PurposeStep({
  onSelectTemplate,
  selectedTemplateId,
}: PurposeStepProps) {
  const selectedTemplate = selectedTemplateId
    ? AGENT_TEMPLATES.find((t) => t.id === selectedTemplateId)
    : null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          What should this agent handle?
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick a template to get started.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {AGENT_TEMPLATES.map((template) => {
          const Icon = ICON_MAP[template.icon]
          const isSelected = selectedTemplateId === template.id
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors ${
                isSelected
                  ? "border-[#1773cf] bg-[#eff6ff]/50"
                  : "border-muted hover:border-[#1773cf] hover:bg-[#eff6ff]/50"
              }`}
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

    </div>
  )
}
