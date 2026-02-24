"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Mail } from "lucide-react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { ConversationList } from "./conversation-list"
import { ConversationThread } from "./conversation-thread"
import { ConversationContact } from "./conversation-contact"
import type { ConversationPreview } from "@/lib/supabase/inbox"

export function InboxPageClient() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/inbox/conversations")
      if (!res.ok) throw new Error("Failed to load conversations")
      const data = (await res.json()) as { conversations: ConversationPreview[] }
      setConversations(data.conversations)
      // Auto-select first conversation
      if (data.conversations.length > 0 && !selectedLeadId) {
        setSelectedLeadId(data.conversations[0].leadId)
      }
    } catch {
      setError("Unable to load inbox")
    } finally {
      setLoading(false)
    }
  }, [selectedLeadId])

  useEffect(() => {
    void loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedConversation = conversations.find(
    (c) => c.leadId === selectedLeadId,
  ) ?? null

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => void loadConversations()}
          className="rounded-sm bg-[#1773cf] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#1565b8]"
        >
          Retry
        </button>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Mail className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/70">
          Send an SMS or email to a lead to start a conversation.
        </p>
      </div>
    )
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="flex-1">
      {/* Conversation List */}
      <ResizablePanel id="inbox-list" defaultSize={25} minSize={15} maxSize={40}>
        <ConversationList
          conversations={conversations}
          selectedLeadId={selectedLeadId}
          onSelect={setSelectedLeadId}
        />
      </ResizablePanel>

      <ResizableHandle />

      {/* Thread */}
      <ResizablePanel id="inbox-thread" defaultSize={50} minSize={30}>
        <ConversationThread
          leadId={selectedLeadId}
          conversation={selectedConversation}
          onMessageSent={loadConversations}
        />
      </ResizablePanel>

      <ResizableHandle />

      {/* Contact Info */}
      <ResizablePanel id="inbox-contact" defaultSize={25} minSize={15} maxSize={35}>
        <ConversationContact conversation={selectedConversation} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
