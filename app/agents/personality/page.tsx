import { Suspense } from "react"
import type { Metadata } from "next"
import { AgentPersonalityClient } from "@/components/agents/agent-personality-client"

export const metadata: Metadata = {
  title: "Agent Personality & Voice | Ensurance",
}

export default function AgentPersonalityPage() {
  return (
    <main className="flex flex-1 flex-col min-h-0">
      <Suspense>
        <AgentPersonalityClient />
      </Suspense>
    </main>
  )
}
