import type { Metadata } from "next"
import { PhoneNumbersSettingsClient } from "@/components/settings/phone-numbers-settings-client"

export const metadata: Metadata = {
  title: "Phone Numbers | Ensurance",
}

export default function PhoneNumbersPage() {
  return <PhoneNumbersSettingsClient />
}
