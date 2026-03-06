import { Suspense } from "react"
import type { Metadata } from "next"
import { AgentSetupClient } from "@/components/agents/agent-setup-client"

export const metadata: Metadata = {
  title: "Agent Setup | Ensurance",
}

export default function AgentSetupPage() {
  return (
    <main className="flex flex-1 flex-col min-h-0">
      <Suspense>
        <AgentSetupClient />
      </Suspense>
    </main>
  )
}
