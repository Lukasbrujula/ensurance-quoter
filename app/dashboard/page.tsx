import type { Metadata } from "next"
import { TopNav } from "@/components/navigation/top-nav"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export const metadata: Metadata = {
  title: "Dashboard | Ensurance",
}

export default function DashboardPage() {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <DashboardClient />
        </div>
      </main>
    </div>
  )
}
