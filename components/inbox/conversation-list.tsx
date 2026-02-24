"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LeadStatusBadge } from "@/components/leads/lead-status-badge"
import { formatDistanceToNow } from "date-fns"
import type { ConversationPreview } from "@/lib/supabase/inbox"

/* ------------------------------------------------------------------ */
/*  Avatar color from first letter                                     */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-purple-600",
  "bg-cyan-600",
  "bg-orange-600",
  "bg-teal-600",
]

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return (parts[0]?.[0] ?? "?").toUpperCase()
}

/* ------------------------------------------------------------------ */
/*  Filter tabs                                                        */
/* ------------------------------------------------------------------ */

type FilterTab = "all" | "recent" | "no_history"

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "recent", label: "Recent" },
  { key: "no_history", label: "New" },
]

/* ------------------------------------------------------------------ */
/*  ConversationList                                                   */
/* ------------------------------------------------------------------ */

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
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")

  const filtered = useMemo(() => {
    let result = conversations

    // Apply filter tab
    if (activeFilter === "recent") {
      result = result.filter((c) => c.hasHistory)
    } else if (activeFilter === "no_history") {
      result = result.filter((c) => !c.hasHistory)
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.leadName.toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q) ||
          (c.email ?? "").toLowerCase().includes(q),
      )
    }

    return result
  }, [conversations, search, activeFilter])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-3 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-bold tracking-tight">Conversations</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {conversations.length}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border px-3 py-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              activeFilter === tab.key
                ? "bg-[#1773cf] text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
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
            No contacts found.
          </p>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.leadId === selectedLeadId
            const initials = getInitials(conv.leadName)
            const avatarColor = getAvatarColor(conv.leadName)

            const preview = conv.lastMessage
              ? conv.lastMessage.length > 50
                ? `${conv.lastMessage.slice(0, 50)}...`
                : conv.lastMessage
              : "No messages yet"

            const timestamp = conv.lastMessageAt ?? conv.createdAt

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
                {/* Avatar */}
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${avatarColor}`}
                >
                  <span className="text-[12px] font-bold text-white">
                    {initials}
                  </span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">
                        {conv.leadName}
                      </p>
                      <div className="shrink-0 scale-75 origin-left">
                        <LeadStatusBadge status={conv.status} />
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(timestamp), {
                        addSuffix: false,
                      })}
                    </span>
                  </div>
                  <p
                    className={`truncate text-[11px] ${
                      conv.hasHistory
                        ? "text-muted-foreground"
                        : "italic text-muted-foreground/50"
                    }`}
                  >
                    {preview}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </ScrollArea>
    </div>
  )
}
