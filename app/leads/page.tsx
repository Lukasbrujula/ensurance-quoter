import { LeadList } from "@/components/leads/lead-list"
import { BackToQuoter } from "@/components/navigation/back-to-quoter"

export default function LeadsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <BackToQuoter />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Manage your lead pipeline — import, enrich, and quote.
        </p>
      </div>
      <LeadList />
    </main>
  )
}
