import type { Metadata } from "next"
import { LicensesSettingsClient } from "@/components/settings/licenses-settings-client"

export const metadata: Metadata = {
  title: "Licenses | Ensurance",
}

export default function LicensesPage() {
  return <LicensesSettingsClient />
}
