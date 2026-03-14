"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Calendar, MapPin, MessageSquare, Zap, Phone, UserCircle } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { format } from "date-fns"
import { PIPELINE_STAGES } from "@/lib/data/pipeline"
import { useLeadStore } from "@/lib/store/lead-store"
import { getFollowUpUrgency } from "./follow-up-scheduler"
import { PreScreenBadge } from "./pre-screen-badge"
import type { Lead, LeadStatus } from "@/lib/types/lead"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface AgentLookup {
  getName: (agentId: string | null) => string | null
  getImageUrl: (agentId: string | null) => string | null
}

interface KanbanBoardProps {
  leads: Lead[]
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void
  onCardClick?: (lead: Lead) => void
  agentLookup?: AgentLookup | null
}

/* ------------------------------------------------------------------ */
/*  Lead Card (draggable)                                               */
/* ------------------------------------------------------------------ */

function LeadCardContent({ lead, agentLookup }: { lead: Lead; agentLookup?: AgentLookup | null }) {
  const name =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed"

  const coverage = lead.coverageAmount
    ? `$${(lead.coverageAmount / 1000).toFixed(0)}K`
    : null
  const term = lead.termLength ? `${lead.termLength}yr` : null
  const coverageLine = [coverage, term].filter(Boolean).join(" \u00b7 ")

  const urgency = getFollowUpUrgency(lead.followUpDate)
  const urgencyColor: Record<string, string> = {
    overdue: "text-red-600 dark:text-red-400",
    today: "text-amber-600 dark:text-amber-400",
    upcoming: "text-blue-600 dark:text-blue-400",
    none: "",
  }

  const agentName = agentLookup?.getName(lead.agentId)
  const agentImage = agentLookup?.getImageUrl(lead.agentId)

  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-semibold leading-tight truncate">
        {name}
      </p>
      {coverageLine && (
        <p className="text-[11px] text-muted-foreground">{coverageLine}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        {lead.state && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {lead.state}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(lead.createdAt), "M/d")}
        </span>
      </div>
      {lead.followUpDate && urgency !== "none" && (
        <div
          className={`flex items-center gap-1 text-[10px] ${urgencyColor[urgency]}`}
        >
          <Calendar className="h-3 w-3" />
          {format(new Date(lead.followUpDate), "M/d h:mma")}
        </div>
      )}
      <PreScreenBadge preScreen={lead.preScreen} compact />
      {agentLookup && (
        <div className="flex items-center gap-1 pt-0.5">
          {lead.agentId ? (
            <>
              <Avatar className="h-4 w-4">
                {agentImage ? (
                  <AvatarImage src={agentImage} alt="" />
                ) : null}
                <AvatarFallback className="text-[8px]">
                  {(agentName ?? "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate">
                {agentName ?? "Agent"}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
              <UserCircle className="h-3 w-3" />
              Unassigned
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function DraggableCard({
  lead,
  onCardClick,
  agentLookup,
}: {
  lead: Lead
  onCardClick?: (lead: Lead) => void
  agentLookup?: AgentLookup | null
}) {
  const router = useRouter()
  const setActiveLead = useLeadStore((s) => s.setActiveLead)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  })

  const handleClick = useCallback(() => {
    if (onCardClick) {
      onCardClick(lead)
    } else {
      setActiveLead(lead)
      router.push(`/leads/${lead.id}`)
    }
  }, [lead, onCardClick, setActiveLead, router])

  const handleQuoteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setActiveLead(lead)
      router.push(`/leads/${lead.id}`)
    },
    [lead, setActiveLead, router],
  )

  const handleSmsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      router.push(`/inbox?leadId=${lead.id}`)
    },
    [lead.id, router],
  )

  const handleCallClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setActiveLead(lead)
      router.push(`/leads/${lead.id}`)
    },
    [lead, setActiveLead, router],
  )

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`group/card cursor-grab rounded-md border border-border bg-background p-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <LeadCardContent lead={lead} agentLookup={agentLookup} />
      {/* Hover quick actions */}
      <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
        <button
          type="button"
          onClick={handleQuoteClick}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600"
          title="Open quote"
        >
          <Zap className="h-3 w-3" />
          Quote
        </button>
        {lead.phone && (
          <button
            type="button"
            onClick={handleSmsClick}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-teal-50 hover:text-teal-600"
            title="Send text message"
          >
            <MessageSquare className="h-3 w-3" />
            Text
          </button>
        )}
        {lead.phone && (
          <button
            type="button"
            onClick={handleCallClick}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-green-50 hover:text-green-600"
            title="Call lead"
          >
            <Phone className="h-3 w-3" />
            Call
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Column (droppable)                                                  */
/* ------------------------------------------------------------------ */

function KanbanColumn({
  status,
  label,
  color,
  leads,
  onCardClick,
  agentLookup,
}: {
  status: string
  label: string
  color: string
  leads: Lead[]
  onCardClick?: (lead: Lead) => void
  agentLookup?: AgentLookup | null
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[200px] flex-1 flex-col rounded-lg border border-border ${
        status === "dead"
          ? "bg-muted/40"
          : "bg-muted/20"
      } ${isOver ? "ring-2 ring-primary/40" : ""}`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}
        >
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          ({leads.length})
        </span>
      </div>

      {/* Scrollable card list */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {leads.map((lead) => (
          <DraggableCard key={lead.id} lead={lead} onCardClick={onCardClick} agentLookup={agentLookup} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Kanban Board                                                        */
/* ------------------------------------------------------------------ */

export function KanbanBoard({ leads, onStatusChange, onCardClick, agentLookup }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Lead[]>()
    for (const stage of PIPELINE_STAGES) {
      map.set(stage.value, [])
    }
    for (const lead of leads) {
      const bucket = map.get(lead.status)
      if (bucket) {
        bucket.push(lead)
      }
    }
    return map
  }, [leads])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const lead = leads.find((l) => l.id === event.active.id)
      setActiveLead(lead ?? null)
    },
    [leads],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveLead(null)
      const { active, over } = event
      if (!over) return

      const leadId = active.id as string
      const newStatus = over.id as LeadStatus

      const lead = leads.find((l) => l.id === leadId)
      if (!lead || lead.status === newStatus) return

      onStatusChange(leadId, newStatus)
    },
    [leads, onStatusChange],
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: 400 }}>
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.value}
            status={stage.value}
            label={stage.label}
            color={stage.color}
            leads={grouped.get(stage.value) ?? []}
            onCardClick={onCardClick}
            agentLookup={agentLookup}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="w-[200px] rounded-md border border-primary/40 bg-background p-2.5 shadow-lg">
            <LeadCardContent lead={activeLead} agentLookup={agentLookup} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
