"use client"

import { useState, useCallback, useRef } from "react"
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels"
import { Bot, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AgentsListClient } from "./agents-list-client"
import { UsageDashboard } from "./usage-dashboard"
import { BusinessProfileSection } from "@/components/settings/business-profile-section"

/* ------------------------------------------------------------------ */
/*  Collapsed icon bar — same pattern as quote-workspace.tsx           */
/* ------------------------------------------------------------------ */

function CollapsedBar({ onExpand }: { onExpand: () => void }) {
  return (
    <div
      className="flex h-full w-full cursor-pointer flex-col items-center border-r border-border bg-muted py-3 transition-colors hover:bg-muted"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      aria-label="Expand Business Profile"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onExpand()
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand()
        }}
        className="flex flex-col items-center gap-2 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-[#e2e8f0] hover:text-foreground"
        title="Expand Business Profile"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <Bot className="h-4 w-4 text-[#94a3b8]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#94a3b8] [writing-mode:vertical-lr]">
          Business Profile
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AgentsPageClient                                                   */
/* ------------------------------------------------------------------ */

const COLLAPSED_SIZE = 3
const LEFT_MIN = 15

export function AgentsPageClient() {
  const [tab, setTab] = useState("agents")
  const [leftOpen, setLeftOpen] = useState(true)

  const leftPanelRef = useRef<PanelImperativeHandle | null>(null)

  const handleLeftCollapse = useCallback(() => {
    leftPanelRef.current?.collapse()
  }, [])

  const handleLeftExpand = useCallback(() => {
    leftPanelRef.current?.expand()
  }, [])

  const handleLeftResize = useCallback(
    (panelSize: PanelSize) => {
      setLeftOpen(panelSize.asPercentage > COLLAPSED_SIZE)
    },
    [],
  )

  return (
    <ResizablePanelGroup orientation="horizontal" className="flex-1">
      {/* ── Left Panel: Business Profile ──────────────────────────── */}
      <ResizablePanel
        id="agents-left"
        panelRef={leftPanelRef}
        defaultSize={22}
        minSize={LEFT_MIN}
        collapsible
        collapsedSize={COLLAPSED_SIZE}
        onResize={handleLeftResize}
      >
        <div
          className={
            leftOpen
              ? "flex h-full flex-col overflow-hidden border-r border-border bg-background shadow-sm"
              : "hidden"
          }
        >
          {/* Collapse button */}
          <div className="flex items-center justify-end border-b border-border px-2 py-1">
            <button
              type="button"
              onClick={handleLeftCollapse}
              className="rounded-sm p-1 text-[#94a3b8] transition-colors hover:bg-muted hover:text-[#475569]"
              title="Collapse Business Profile"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              <BusinessProfileSection compact />
            </div>
          </ScrollArea>
        </div>
        <div className={leftOpen ? "hidden" : "h-full"}>
          <CollapsedBar onExpand={handleLeftExpand} />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* ── Right Panel: Agent cards + Usage tabs ─────────────────── */}
      <ResizablePanel id="agents-right" defaultSize={78} minSize={50}>
        <ScrollArea className="h-full">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList>
                <TabsTrigger value="agents">My Agents</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
              </TabsList>

              <TabsContent value="agents" className="mt-6">
                <AgentsListClient />
              </TabsContent>

              <TabsContent value="usage" className="mt-6">
                <UsageDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
