"use client"

import { useState, useMemo } from "react"
import { Search, MessageSquare, Mail, CheckCheck, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LeadStatusBadge } from "@/components/leads/lead-status-badge"
import { formatDistanceToNow } from "date-fns"
import type { ConversationPreview, InboxChannel } from "@/lib/supabase/inbox"

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

type FilterTab = "all" | "unread" | "read" | "starred" | "urgent"

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "starred", label: "Starred" },
  { key: "urgent", label: "Urgent" },
]

/* ------------------------------------------------------------------ */
/*  Channel filter                                                     */
/* ------------------------------------------------------------------ */

type ChannelFilter = "all" | InboxChannel

const CHANNEL_FILTERS: { key: ChannelFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "All", icon: CheckCheck },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "email", label: "Email", icon: Mail },
]

/* ------------------------------------------------------------------ */
/*  Channel icon                                                       */
/* ------------------------------------------------------------------ */

function ChannelIcon({ type }: { type: "sms" | "email" | "call" | null }) {
  if (type === "email") {
    return <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
  }
  return <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground/60" />
}

/* ------------------------------------------------------------------ */
/*  ConversationList                                                   */
/* ------------------------------------------------------------------ */

interface ConversationListProps {
  conversations: ConversationPreview[]
  selectedLeadId: string | null
  onSelect: (leadId: string) => void
  onMarkAllRead: () => void
  onToggleStar: (leadId: string) => void
  /** Resolve agentId → display name (team mode only). */
  getAgentName?: (agentId: string | null) => string | null
  /** Whether the list is showing team-scoped data. */
  isTeamScope?: boolean
}

export function ConversationList({
  conversations,
  selectedLeadId,
  onSelect,
  onMarkAllRead,
  onToggleStar,
  getAgentName,
  isTeamScope = false,
}: ConversationListProps) {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all")

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  )

  const totalUrgent = useMemo(
    () => conversations.filter((c) => c.urgent).length,
    [conversations],
  )

  const filtered = useMemo(() => {
    let result = conversations

    // Apply filter tab
    if (activeFilter === "unread") {
      result = result.filter((c) => c.unreadCount > 0)
    } else if (activeFilter === "read") {
      result = result.filter((c) => c.unreadCount === 0 && c.hasHistory)
    } else if (activeFilter === "starred") {
      result = result.filter((c) => c.starred)
    } else if (activeFilter === "urgent") {
      result = result.filter((c) => c.urgent)
    }

    // Apply channel filter
    if (channelFilter === "sms") {
      result = result.filter(
        (c) => c.lastMessageType === "sms" || c.lastMessageType === null,
      )
    } else if (channelFilter === "email") {
      result = result.filter((c) => c.lastMessageType === "email")
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

    // Sort: urgent first within results
    return [...result].sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
      return 0
    })
  }, [conversations, search, activeFilter, channelFilter])

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
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              activeFilter === tab.key
                ? "bg-[#1773cf] text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
            {tab.key === "unread" && totalUnread > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                  activeFilter === "unread"
                    ? "bg-white/20 text-white"
                    : "bg-[#1773cf] text-white"
                }`}
              >
                {totalUnread}
              </span>
            )}
            {tab.key === "urgent" && totalUrgent > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                  activeFilter === "urgent"
                    ? "bg-white/20 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {totalUrgent}
              </span>
            )}
          </button>
        ))}
        {/* Mark all read */}
        {totalUnread > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="ml-auto rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Mark all as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Channel filter */}
      <div className="flex gap-1 border-b border-border px-3 py-1.5">
        {CHANNEL_FILTERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setChannelFilter(key)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
              channelFilter === key
                ? "bg-muted text-foreground"
                : "text-muted-foreground/70 hover:text-muted-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
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
            const hasUnread = conv.unreadCount > 0

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
                <div className="relative mt-0.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${avatarColor}`}
                  >
                    <span className="text-[12px] font-bold text-white">
                      {initials}
                    </span>
                  </div>
                  {hasUnread && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1773cf] text-[8px] font-bold text-white ring-2 ring-background">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Urgent indicator */}
                      {conv.urgent && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      )}
                      <p
                        className={`truncate text-[13px] text-foreground ${
                          hasUnread ? "font-bold" : "font-semibold"
                        }`}
                      >
                        {conv.leadName}
                      </p>
                      <div className="shrink-0 scale-75 origin-left">
                        <LeadStatusBadge status={conv.status} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(timestamp), {
                          addSuffix: false,
                        })}
                      </span>
                      {/* Star toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleStar(conv.leadId)
                        }}
                        className="cursor-pointer rounded p-0.5 transition-colors hover:bg-muted"
                        title={conv.starred ? "Unstar" : "Star"}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            conv.starred
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/40 hover:text-muted-foreground"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  {/* Agent attribution (team mode only) */}
                  {isTeamScope && getAgentName && conv.agentId && (
                    <p className="truncate text-[10px] text-muted-foreground/70">
                      {getAgentName(conv.agentId) ?? "Unknown agent"}
                    </p>
                  )}
                  <div className="flex items-center gap-1">
                    <ChannelIcon type={conv.lastMessageType} />
                    <p
                      className={`truncate text-[11px] ${
                        hasUnread
                          ? "font-medium text-foreground"
                          : conv.hasHistory
                            ? "text-muted-foreground"
                            : "italic text-muted-foreground/50"
                      }`}
                    >
                      {preview}
                    </p>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </ScrollArea>
    </div>
  )
}
