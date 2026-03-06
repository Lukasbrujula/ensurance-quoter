import type { Metadata } from "next"
import { TopNav } from "@/components/navigation/top-nav"
import { HistoryClient } from "@/components/history/history-client"

export const metadata: Metadata = {
  title: "History | Ensurance",
}

export default function HistoryPage() {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <HistoryClient />
        </div>
      </main>
    </div>
  )
}
