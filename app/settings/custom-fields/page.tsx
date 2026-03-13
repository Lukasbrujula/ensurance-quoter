import type { Metadata } from "next"
import { CustomFieldsSettingsClient } from "@/components/settings/custom-fields-settings-client"

export const metadata: Metadata = {
  title: "Custom Fields | Ensurance",
}

export default function CustomFieldsSettingsPage() {
  return <CustomFieldsSettingsClient />
}
