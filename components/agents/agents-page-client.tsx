"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AgentsListClient } from "./agents-list-client"
import { UsageDashboard } from "./usage-dashboard"

export function AgentsPageClient() {
  const [tab, setTab] = useState("agents")

  return (
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
  )
}
