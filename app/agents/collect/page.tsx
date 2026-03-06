import { Suspense } from "react"
import type { Metadata } from "next"
import { AgentCollectFieldsClient } from "@/components/agents/agent-collect-fields-client"

export const metadata: Metadata = {
  title: "Collection Fields | Ensurance",
}

export default function AgentCollectFieldsPage() {
  return (
    <main className="flex flex-1 flex-col min-h-0">
      <Suspense>
        <AgentCollectFieldsClient />
      </Suspense>
    </main>
  )
}
