import { Suspense } from "react"
import type { Metadata } from "next"
import { CheckEmailCard } from "@/components/auth/check-email-card"

export const metadata: Metadata = {
  title: "Check Your Email — My Insurance Quoter",
  description:
    "A confirmation link has been sent to your email address.",
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <CheckEmailCard />
    </Suspense>
  )
}
