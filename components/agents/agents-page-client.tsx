"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AgentsListClient } from "./agents-list-client"
import { UsageDashboard } from "./usage-dashboard"

export function AgentsPageClient() {
  const [tab, setTab] = useState("agents")

  return (
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
  )
}
