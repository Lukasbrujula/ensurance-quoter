import type { Metadata } from "next"
import { QuotePageClient } from "./quote-page-client"

export const metadata: Metadata = {
  title: "Quote Engine | Ensurance Quoter",
  description: "Compare term life insurance quotes from 30+ carriers instantly.",
}

export default function QuotePage() {
  return <QuotePageClient />
}
