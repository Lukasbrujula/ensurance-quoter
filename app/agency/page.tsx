import type { Metadata } from "next"
import { AgencyOverviewClient } from "@/components/agency/agency-overview-client"

export const metadata: Metadata = {
  title: "Agency | Ensurance",
}

export default function AgencyPage() {
  return (
    <main className="mx-auto max-w-7xl overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <AgencyOverviewClient />
    </main>
  )
}
