import type { Metadata } from "next"
import { CommissionSettingsClient } from "@/components/settings/commission-settings-client"

export const metadata: Metadata = {
  title: "Commission Settings | Ensurance",
}

export default function SettingsPage() {
  return <CommissionSettingsClient />
}
