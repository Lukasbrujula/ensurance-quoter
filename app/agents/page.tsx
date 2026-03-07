import type { Metadata } from "next"
import { Suspense } from "react"
import { AgentsPageClient } from "@/components/agents/agents-page-client"
import { BackToQuoter } from "@/components/navigation/back-to-quoter"

export const metadata: Metadata = {
  title: "AI Agents | Ensurance",
}

export default function AgentsPage() {
  return (
    <main className="flex flex-1 flex-col min-h-0">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <BackToQuoter />
      </div>
      <Suspense>
        <AgentsPageClient />
      </Suspense>
    </main>
  )
}
