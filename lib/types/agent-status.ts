export interface OnboardingStep {
  id: string
  label: string
  completed: boolean
}

export interface AgentOnboardingStatus {
  agentId: string
  completedCount: number
  totalSteps: number
  steps: OnboardingStep[]
}

export type AgentStatusResponse =
  | { success: true; data: Record<string, AgentOnboardingStatus> }
  | { success: false; error: string }
