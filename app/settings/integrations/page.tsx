import type { Metadata } from "next"
import { IntegrationsSettingsClient } from "@/components/settings/integrations-settings-client"

export const metadata: Metadata = {
  title: "Integrations | Ensurance",
}

export default function IntegrationsPage() {
  return <IntegrationsSettingsClient />
}
