import { Suspense } from "react"
import { InboxPageClient } from "@/components/inbox/inbox-page-client"

export default function InboxPage() {
  return (
    <Suspense>
      <InboxPageClient />
    </Suspense>
  )
}
