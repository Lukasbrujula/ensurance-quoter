import type { Metadata } from "next"
import { CarriersSettingsClient } from "@/components/settings/carriers-settings-client"

export const metadata: Metadata = {
  title: "My Carriers | Ensurance",
}

export default function CarriersSettingsPage() {
  return <CarriersSettingsClient />
}
