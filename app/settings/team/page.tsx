import type { Metadata } from "next"
import { TeamSettingsClient } from "@/components/settings/team-settings-client"

export const metadata: Metadata = {
  title: "Team Management | Ensurance",
}

export default function TeamSettingsPage() {
  return <TeamSettingsClient />
}
