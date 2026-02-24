"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2 } from "lucide-react"
import { ConversationList } from "./conversation-list"
import { ConversationThread } from "./conversation-thread"
import { ConversationContact } from "./conversation-contact"
import { useLeadStore } from "@/lib/store/lead-store"
import type { ConversationPreview } from "@/lib/supabase/inbox"
import type { Lead } from "@/lib/types/lead"

const POLL_INTERVAL = 30_000 // 30 seconds

interface PhoneNumberInfo {
  phoneNumber: string
  isPrimary: boolean
}

export function InboxPageClient() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [primaryNumber, setPrimaryNumber] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hydrateLeads = useLeadStore((s) => s.hydrateLeads)
  const hydrateLead = useLeadStore((s) => s.hydrateLead)
  const leads = useLeadStore((s) => s.leads)

  const loadConversations = useCallback(async () => {
    try {
      if (loading) {
        setError(null)
      }

      // Hydrate lead store if empty
      if (leads.length === 0) {
        await hydrateLeads()
      }

      const res = await fetch("/api/inbox/conversations")
      if (!res.ok) throw new Error("Failed to load conversations")
      const data = (await res.json()) as { conversations: ConversationPreview[] }
      setConversations(data.conversations)

      // Auto-select first conversation
      if (data.conversations.length > 0 && !selectedLeadId) {
        setSelectedLeadId(data.conversations[0].leadId)
      }
    } catch {
      if (loading) {
        setError("Unable to load inbox")
      }
    } finally {
      setLoading(false)
    }
  }, [hydrateLeads, leads.length, selectedLeadId, loading])

  // Fetch agent's primary phone number
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/phone-numbers")
        if (!res.ok) return
        const data = (await res.json()) as { numbers: PhoneNumberInfo[] }
        const primary = data.numbers.find((n) => n.isPrimary)
        setPrimaryNumber(primary?.phoneNumber ?? null)
      } catch {
        // Non-critical
      }
    })()
  }, [])

  useEffect(() => {
    void loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll for new conversations every 30s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      void loadConversations()
    }, POLL_INTERVAL)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [loadConversations])

  // Fetch full lead data when selection changes
  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null)
      return
    }

    // Check store first
    const storeMatch = leads.find((l) => l.id === selectedLeadId)
    if (storeMatch) {
      setSelectedLead(storeMatch)
      return
    }

    // Hydrate from Supabase
    void hydrateLead(selectedLeadId).then((lead) => {
      if (lead) setSelectedLead(lead)
    })
  }, [selectedLeadId, leads, hydrateLead])

  const selectedConversation =
    conversations.find((c) => c.leadId === selectedLeadId) ?? null

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

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Conversation List — 28% */}
      <div className="w-[28%] min-w-[260px] shrink-0 overflow-hidden">
        <ConversationList
          conversations={conversations}
          selectedLeadId={selectedLeadId}
          onSelect={setSelectedLeadId}
        />
      </div>

      {/* Thread — flexible center */}
      <div className="flex-1 overflow-hidden border-x border-border">
        <ConversationThread
          leadId={selectedLeadId}
          conversation={selectedConversation}
          lead={selectedLead}
          onMessageSent={loadConversations}
          primaryNumber={primaryNumber}
        />
      </div>

      {/* Contact Info — 28% */}
      <div className="w-[28%] min-w-[260px] shrink-0 overflow-hidden">
        <ConversationContact lead={selectedLead} />
      </div>
    </div>
  )
}
