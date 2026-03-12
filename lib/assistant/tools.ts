/**
 * Tool definitions for the Underwriting Assistant.
 *
 * The `get_quote` tool lets the LLM fetch real carrier pricing via
 * our existing pricing provider (Compulife cloud API).
 */

import { z } from "zod"
import { tool } from "ai"
import { pricingProvider } from "@/lib/engine/pricing-config"
import type { PricingRequest, PricingResult } from "@/lib/engine/pricing"

const quoteParamsSchema = z.object({
  age: z.number().int().min(18).max(85).describe("Applicant age (18-85)"),
  gender: z.enum(["male", "female"]).describe("Applicant gender"),
  state: z.string().length(2).describe("Two-letter state code (e.g., TX, NY, CA)"),
  coverage_amount: z.number().min(25000).max(10000000).describe("Face amount in dollars (e.g., 500000)"),
  term_years: z.number().describe("Term length in years (10, 15, 20, 25, 30)"),
  tobacco_status: z.enum(["non_smoker", "smoker"]).describe("Tobacco/nicotine user status"),
  health_class: z
    .enum(["preferred_plus", "preferred", "standard", "substandard"])
    .optional()
    .describe("Health classification. Default to standard if unknown."),
})

type QuoteParams = z.infer<typeof quoteParamsSchema>

function mapHealthClassParam(
  healthClass: QuoteParams["health_class"],
): string | undefined {
  switch (healthClass) {
    case "preferred_plus": return "PP"
    case "preferred": return "P"
    case "standard": return "R"
    case "substandard": return "R"
    default: return undefined
  }
}

function formatQuoteResults(results: PricingResult[], params: QuoteParams): string {
  if (results.length === 0) {
    return "No pricing data available for this combination. I can still help with underwriting rules and carrier eligibility."
  }

  // Sort by monthly premium ascending
  const sorted = [...results].sort((a, b) => a.monthlyPremium - b.monthlyPremium)

  // Take top 15 for readability
  const top = sorted.slice(0, 15)

  const lines: string[] = [
    `Quote results for: ${params.age}${params.gender === "male" ? "M" : "F"} ${params.tobacco_status === "smoker" ? "Smoker" : "Non-smoker"} in ${params.state.toUpperCase()}, $${params.coverage_amount.toLocaleString()} ${params.term_years}yr term`,
    "",
    "| Carrier | Product | Monthly | Annual | Risk Class | Source |",
    "|---------|---------|---------|--------|------------|--------|",
  ]

  for (const r of top) {
    lines.push(
      `| ${r.carrierName} | ${r.productName} | $${r.monthlyPremium.toFixed(2)} | $${r.annualPremium.toFixed(2)} | ${r.riskClass ?? "Standard"} | ${r.source} |`
    )
  }

  if (sorted.length > 15) {
    lines.push(`\n(${sorted.length - 15} more results omitted — showing top 15 by price)`)
  }

  lines.push("\n[Live Compulife pricing] — These are real carrier rates.")

  return lines.join("\n")
}

async function executeGetQuote(params: QuoteParams): Promise<string> {
  const pricingRequest: PricingRequest = {
    age: params.age,
    gender: params.gender === "male" ? "Male" : "Female",
    state: params.state.toUpperCase(),
    coverageAmount: params.coverage_amount,
    termLength: params.term_years,
    tobaccoStatus: params.tobacco_status === "smoker" ? "smoker" : "non-smoker",
    healthClassOverride: mapHealthClassParam(params.health_class),
  }

  try {
    const results = await pricingProvider.getQuotes(pricingRequest)
    return formatQuoteResults(results, params)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `Pricing data temporarily unavailable (${message}). I can still help with underwriting rules, carrier eligibility, and general guidance.`
  }
}

export const assistantTools = {
  get_quote: tool({
    description:
      "Get life insurance premium quotes from carriers. Use this when the user asks about pricing, rates, premiums, or cost comparisons. Returns monthly and annual premiums from available carriers.",
    inputSchema: quoteParamsSchema,
    execute: executeGetQuote,
  }),
}
