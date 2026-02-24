"use client"

import { useState, useMemo } from "react"
import { Search, MessageSquare, Mail, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import type { ConversationPreview } from "@/lib/supabase/inbox"

const TYPE_ICONS: Record<string, typeof MessageSquare> = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
}

interface ConversationListProps {
  conversations: ConversationPreview[]
  selectedLeadId: string | null
  onSelect: (leadId: string) => void
}

export function ConversationList({
  conversations,
  selectedLeadId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) =>
        c.leadName.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    )
  }, [conversations, search])

  return (
    <div className="flex h-full flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="border-b border-border px-3 py-3">
        <h2 className="text-[14px] font-bold tracking-tight">Inbox</h2>
        <p className="text-[11px] text-muted-foreground">
          {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
            No conversations found.
          </p>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.leadId === selectedLeadId
            const Icon = TYPE_ICONS[conv.lastMessageType] ?? MessageSquare
            const preview =
              conv.lastMessage.length > 60
                ? `${conv.lastMessage.slice(0, 60)}...`
                : conv.lastMessage

            return (
              <button
                key={conv.leadId}
                type="button"
                onClick={() => onSelect(conv.leadId)}
                className={`flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "bg-[#eff6ff] dark:bg-[#1773cf]/10"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {conv.leadName}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {preview}
                  </p>
                  {conv.state && (
                    <span className="text-[10px] text-muted-foreground/60">
                      {conv.state}
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </ScrollArea>
    </div>
  )
}
