import type { Metadata } from "next"
import { TopNav } from "@/components/navigation/top-nav"
import { CalendarPageClient } from "@/components/calendar/calendar-page-client"

export const metadata: Metadata = {
  title: "Calendar | Ensurance",
}

export default function CalendarPage() {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <main className="flex-1 overflow-hidden">
        <CalendarPageClient />
      </main>
    </div>
  )
}
