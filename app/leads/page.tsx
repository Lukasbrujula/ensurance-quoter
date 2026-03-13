import { LeadList } from "@/components/leads/lead-list"
import { BackToQuoter } from "@/components/navigation/back-to-quoter"

export default function LeadsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <BackToQuoter />
        <div className="mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Manage your lead pipeline — import, enrich, and quote.
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <LeadList />
      </div>
    </div>
  )
}
