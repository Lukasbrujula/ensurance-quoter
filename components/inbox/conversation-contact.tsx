"use client"

import Link from "next/link"
import { User, Phone, Mail, MapPin, ExternalLink } from "lucide-react"
import type { ConversationPreview } from "@/lib/supabase/inbox"

interface ConversationContactProps {
  conversation: ConversationPreview | null
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {label}
        </p>
        <p className="truncate text-[12px] text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function ConversationContact({ conversation }: ConversationContactProps) {
  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center border-l border-border bg-muted/20">
        <User className="h-8 w-8 text-muted-foreground/20" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1773cf]">
          <span className="text-[16px] font-bold text-white">
            {conversation.leadName.charAt(0).toUpperCase()}
          </span>
        </div>
        <p className="mt-2 text-[14px] font-semibold">{conversation.leadName}</p>
      </div>

      {/* Contact details */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        <InfoRow icon={Phone} label="Phone" value={conversation.phone} />
        <InfoRow icon={Mail} label="Email" value={conversation.email} />
        <InfoRow icon={MapPin} label="State" value={conversation.state} />
      </div>

      {/* Actions */}
      <div className="border-t border-border px-4 py-3">
        <Link
          href={`/leads/${conversation.leadId}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-sm bg-[#1773cf] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#1565b8]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Full Lead
        </Link>
      </div>
    </div>
  )
}
