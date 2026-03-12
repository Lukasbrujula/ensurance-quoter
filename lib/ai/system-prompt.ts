import { CARRIER_INTELLIGENCE_SUMMARY } from "@/lib/data/carrier-intelligence-summary"
import type { QuoteRequest, QuoteResponse } from "@/lib/types"

function formatIntakeContext(data: QuoteRequest): string {
  const lines = [
    `Name: ${data.name}`,
    data.birthMonth && data.birthDay && data.birthYear
      ? `DOB: ${String(data.birthMonth).padStart(2, "0")}/${String(data.birthDay).padStart(2, "0")}/${data.birthYear} (age ${data.age})`
      : `Age: ${data.age}`,
    `Gender: ${data.gender}`,
    `State: ${data.state}`,
    `Coverage: $${data.coverageAmount.toLocaleString()}`,
    `Term: ${data.termLength} years`,
    `Tobacco: ${data.tobaccoStatus}`,
  ]

  if (data.medicalConditions && data.medicalConditions.length > 0) {
    lines.push(`Medical conditions: ${data.medicalConditions.join(", ")}`)
  }

  if (data.medications) {
    lines.push(`Medications: ${data.medications}`)
  }

  if (data.duiHistory) {
    lines.push(
      `DUI history: Yes${data.yearsSinceLastDui != null ? ` (${data.yearsSinceLastDui} years ago)` : ""}`,
    )
  }

  return lines.join("\n")
}

function formatQuoteSummary(response: QuoteResponse): string {
  const eligible = response.quotes.filter((q) => q.isEligible)
  const ineligible = response.quotes.filter((q) => !q.isEligible)

  const lines = [
    `Total carriers checked: ${response.totalCarriersChecked}`,
    `Eligible: ${eligible.length}`,
    `Client summary: ${response.clientSummary}`,
  ]

  if (eligible.length > 0) {
    lines.push("\nEligible carriers (sorted by match score):")
    for (const q of eligible) {
      const best = q.isBestValue ? " [BEST VALUE]" : ""
      lines.push(
        `  - ${q.carrier.name}: $${q.monthlyPremium.toFixed(2)}/mo ($${q.annualPremium.toFixed(2)}/yr) | Match: ${q.matchScore}/100 | ${q.carrier.amBest}${best}`,
      )
    }
  }

  if (ineligible.length > 0) {
    lines.push("\nIneligible carriers:")
    for (const q of ineligible) {
      lines.push(
        `  - ${q.carrier.name}: ${q.ineligibilityReason ?? "Unknown reason"}`,
      )
    }
  }

  return lines.join("\n")
}

export function buildSystemPrompt(context?: {
  intakeData?: QuoteRequest
  quoteResponse?: QuoteResponse
}): string {
  const sections = [
    `You are an expert insurance AI assistant embedded in the Ensurance quote engine. You help insurance agents compare carriers, understand underwriting rules, and find the best match for their clients.

RULES:
- Be concise and actionable. Agents are on calls with clients — keep responses under 150 words unless asked for detail.
- Always cite specific carrier names and rules. Never give generic advice.
- When comparing carriers, use specific data points (AM Best ratings, tobacco rules, DUI rules, state availability, medical acceptance criteria).
- If a client has a DUI, immediately mention United Home Life DLX and Transamerica flat extra.
- If a client vapes, immediately mention Foresters YourTerm non-smoker rates.
- If a client uses non-cigarette nicotine (cigars, smokeless, NRT/ZYN), mention John Hancock.
- Format pricing as dollar amounts. Format lists with bullet points.
- If you don't have enough information to answer, ask the agent to fill in the missing intake fields.
- When enrichment data is provided about a lead, always give actionable recommendations even with incomplete data. Use these heuristics:
  * Age: If birth_year unavailable, estimate from education dates (assume ~18 at bachelor's start).
  * Income: If inferred_salary unavailable, estimate from job title + company size + industry (e.g. engineer at small tech = $70-120K).
  * Coverage recommendation: Use 10-15x estimated annual income as starting point.
  * Always name specific carriers and explain WHY each is a good fit for this specific profile.
  * End with 2-3 specific questions the agent should ask the client to refine the recommendation.
  * Never just say "I need more information" without first giving your best estimate based on what you have.`,

    CARRIER_INTELLIGENCE_SUMMARY,
  ]

  if (context?.intakeData) {
    sections.push(
      `\nCURRENT CLIENT PROFILE:\n${formatIntakeContext(context.intakeData)}`,
    )
  }

  if (context?.quoteResponse) {
    sections.push(
      `\nCURRENT QUOTE RESULTS:\n${formatQuoteSummary(context.quoteResponse)}`,
    )
  }

  return sections.join("\n\n")
}
