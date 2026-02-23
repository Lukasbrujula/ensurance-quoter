import type { Metadata } from "next"
import { AgentsPageClient } from "@/components/agents/agents-page-client"

export const metadata: Metadata = {
  title: "AI Agents | Ensurance",
}

export default function AgentsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AgentsPageClient />
    </main>
  )
}
