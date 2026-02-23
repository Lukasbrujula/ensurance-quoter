import type { Metadata } from "next"
import { UsageClient } from "@/components/settings/usage-client"

export const metadata: Metadata = {
  title: "Usage | Ensurance",
}

export default function UsagePage() {
  return <UsageClient />
}
