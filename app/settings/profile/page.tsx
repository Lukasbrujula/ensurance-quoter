import type { Metadata } from "next"
import { ProfileSettingsClient } from "@/components/settings/profile-settings-client"

export const metadata: Metadata = {
  title: "Profile Settings | Ensurance",
}

export default function ProfileSettingsPage() {
  return <ProfileSettingsClient />
}
