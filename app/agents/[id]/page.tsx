import type { Metadata } from "next"
import { AgentDetailClient } from "@/components/agents/agent-detail-client"

export const metadata: Metadata = {
  title: "Agent Details | Ensurance",
}

interface AgentDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params
  return <AgentDetailClient agentId={id} />
}
