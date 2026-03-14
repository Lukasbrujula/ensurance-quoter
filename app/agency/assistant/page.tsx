import type { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AgencyChatInterface } from "@/components/agency/agency-chat-interface"

export const metadata: Metadata = {
  title: "Agency Manager | Ensurance",
}

export default async function AgencyAssistantPage() {
  const { orgId, orgRole } = await auth()

  if (!orgId || orgRole !== "org:admin") {
    redirect("/leads")
  }

  return <AgencyChatInterface />
}
