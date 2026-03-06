import { Wrench, Puzzle } from "lucide-react"
import { TopNav } from "@/components/navigation/top-nav"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const PLACEHOLDER_SLOTS = [
  "CRM Sync",
  "Email Campaigns",
  "Document Signing",
  "Lead Scoring",
  "Analytics Export",
  "Custom Webhooks",
] as const

export default function ToolsPage() {
  return (
    <>
      <TopNav />
      <main className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
          <p className="mt-1 text-muted-foreground">
            Integrations and productivity tools — coming soon
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLACEHOLDER_SLOTS.map((title) => (
            <Card key={title} className="relative overflow-hidden opacity-60">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Puzzle className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">{title}</p>
                <Badge variant="secondary" className="text-xs">
                  Coming Soon
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  )
}
