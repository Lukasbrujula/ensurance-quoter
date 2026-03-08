/**
 * Builds the carrier intelligence context string for the Underwriting Assistant system prompt.
 *
 * Loads all carrier data from lib/data/carriers.ts and formats it into a structured
 * context block. Cached at module level since carrier data doesn't change at runtime.
 */

import { CARRIERS } from "@/lib/data/carriers"
import type { Carrier } from "@/lib/types"

let cachedContext: string | null = null

/**
 * Returns the full carrier intelligence context for injection into the system prompt.
 * Result is cached after first call.
 */
export function buildAssistantContext(): string {
  if (cachedContext) return cachedContext
  cachedContext = compileContext(CARRIERS as readonly Carrier[])
  return cachedContext
}

function compileContext(carriers: readonly Carrier[]): string {
  const sections: string[] = []

  sections.push(`Total carriers in database: ${carriers.length}`)
  sections.push("")

  // 1. Tobacco classification matrix
  sections.push(buildTobaccoMatrix(carriers))

  // 2. State availability
  sections.push(buildStateAvailability(carriers))

  // 3. DUI rules
  sections.push(buildDuiRules(carriers))

  // 4. Medical conditions (enriched carriers only)
  sections.push(buildMedicalConditions(carriers))

  // 5. Combination declines
  sections.push(buildCombinationDeclines(carriers))

  // 6. Prescription screening summary
  sections.push(buildPrescriptionSummary(carriers))

  // 7. Product parameters
  sections.push(buildProductParameters(carriers))

  // 8. Living benefits
  sections.push(buildLivingBenefits(carriers))

  // 9. Rate class criteria
  sections.push(buildRateClassCriteria(carriers))

  // 10. Operational info
  sections.push(buildOperationalInfo(carriers))

  return sections.join("\n")
}

/* ── Tobacco Matrix ─────────────────────────────────────────────────── */

function normalizeTobaccoCell(value: string): string {
  const lower = value.toLowerCase()
  if (
    lower.startsWith("tobacco rate") ||
    lower === "tobacco" ||
    lower.startsWith("tobacco;")
  ) {
    return "TOBACCO"
  }
  if (
    lower.startsWith("non-smoker") ||
    lower.startsWith("non-tobacco") ||
    lower.startsWith("nontobacco")
  ) {
    return "NON-TOBACCO"
  }
  // Keep the original detail for nuanced entries (e.g. "Preferred Best NT possible (≤2x/week)")
  return value
}

function buildTobaccoMatrix(carriers: readonly Carrier[]): string {
  const lines = [
    "## TOBACCO CLASSIFICATION MATRIX",
    "",
    "Every cell is authoritative — if it says TOBACCO, the carrier charges tobacco rates for that product.",
    "If a carrier is not listed here, we have NO tobacco data for them — do not guess their policy.",
    "",
    "| Carrier | Cigarettes | Cigars | Vaping | Smokeless | NRT/Pouches | Marijuana | Quit Lookback | Key Note |",
    "|---------|-----------|--------|--------|-----------|-------------|-----------|---------------|----------|",
  ]

  for (const c of carriers) {
    if (!c.tobacco) continue
    const t = c.tobacco
    lines.push(
      `| ${c.name} | ${normalizeTobaccoCell(t.cigarettes)} | ${normalizeTobaccoCell(t.cigars)} | ${normalizeTobaccoCell(t.vaping)} | ${normalizeTobaccoCell(t.smokeless)} | ${normalizeTobaccoCell(t.nrt)} | ${normalizeTobaccoCell(t.marijuana)} | ${t.quitLookback} | ${t.keyNote || "—"} |`
    )
  }

  return lines.join("\n")
}

/* ── State Availability ─────────────────────────────────────────────── */

function buildStateAvailability(carriers: readonly Carrier[]): string {
  const lines = ["", "## State Availability", ""]

  const allStates = carriers.filter(
    (c) => !c.statesNotAvailable || c.statesNotAvailable.length === 0
  )
  const restricted = carriers.filter(
    (c) => c.statesNotAvailable && c.statesNotAvailable.length > 0
  )

  if (allStates.length > 0) {
    lines.push(`**Available in all states:** ${allStates.map((c) => c.name).join(", ")}`)
    lines.push("")
  }

  if (restricted.length > 0) {
    lines.push("**State restrictions:**")
    for (const c of restricted) {
      lines.push(`- **${c.name}**: NOT available in ${c.statesNotAvailable.join(", ")}`)
    }
  }

  return lines.join("\n")
}

/* ── DUI Rules ──────────────────────────────────────────────────────── */

function buildDuiRules(carriers: readonly Carrier[]): string {
  const lines = ["", "## DUI / Driving Record Policies", ""]

  for (const c of carriers) {
    if (!c.dui) continue
    const d = c.dui
    let line = `- **${c.name}**: ${d.rule} → ${d.result}`
    if (d.lookbackYears) line += ` (${d.lookbackYears}yr lookback)`
    if (d.flatExtra) line += ` | Flat extra: ${d.flatExtra}`
    if (d.specialRules) line += ` | ${d.specialRules}`
    lines.push(line)
  }

  return lines.join("\n")
}

/* ── Medical Conditions ─────────────────────────────────────────────── */

function buildMedicalConditions(carriers: readonly Carrier[]): string {
  const lines = ["", "## Medical Condition Underwriting Rules", ""]
  lines.push("Only carriers with structured medical data are listed. For unlisted carriers, advise the agent to check with the carrier directly.")
  lines.push("")

  const enriched = carriers.filter(
    (c) => c.medicalConditions && c.medicalConditions.length > 0
  )

  for (const c of enriched) {
    lines.push(`### ${c.name} (${c.medicalConditions!.length} conditions)`)

    for (const mc of c.medicalConditions!) {
      let entry = `- ${mc.condition}: **${mc.decision}**`
      if (mc.rateClass) entry += ` (${mc.rateClass})`
      if (mc.lookbackMonths) entry += ` [${mc.lookbackMonths}mo lookback]`
      if (mc.conditions) entry += ` — ${mc.conditions}`
      if (mc.notes) entry += ` — ${mc.notes}`
      lines.push(entry)
    }
    lines.push("")
  }

  return lines.join("\n")
}

/* ── Combination Declines ───────────────────────────────────────────── */

function buildCombinationDeclines(carriers: readonly Carrier[]): string {
  const lines = ["", "## Combination Decline Rules", ""]
  lines.push("These multi-condition triggers result in automatic decline.")
  lines.push("")

  const enriched = carriers.filter(
    (c) => c.combinationDeclines && c.combinationDeclines.length > 0
  )

  for (const c of enriched) {
    lines.push(`### ${c.name}`)
    for (const cd of c.combinationDeclines!) {
      let entry = `- ${cd.conditions.join(" + ")}: **${cd.decision}**`
      if (cd.notes) entry += ` — ${cd.notes}`
      lines.push(entry)
    }
    lines.push("")
  }

  return lines.join("\n")
}

/* ── Prescription Screening Summary ─────────────────────────────────── */

function buildPrescriptionSummary(carriers: readonly Carrier[]): string {
  const lines = ["", "## Prescription Drug Screening", ""]
  lines.push("Full medication lists are available for carriers below. Ask about specific medications for detailed rules.")
  lines.push("")

  const enriched = carriers.filter(
    (c) => c.prescriptionExclusions && c.prescriptionExclusions.medications.length > 0
  )

  for (const c of enriched) {
    const rx = c.prescriptionExclusions!
    const total = rx.medications.length
    const declines = rx.medications.filter((m) => m.action === "DECLINE").length
    const reviews = rx.medications.filter((m) => m.action === "REVIEW").length

    lines.push(`- **${c.name}**: ${total} medications screened (${declines} decline, ${reviews} review)`)

    // List the top decline medications (limit to 20 for prompt size)
    const declineMeds = rx.medications
      .filter((m) => m.action === "DECLINE")
      .slice(0, 20)
    if (declineMeds.length > 0) {
      lines.push(`  Decline medications include: ${declineMeds.map((m) => m.name).join(", ")}${declines > 20 ? ` ... and ${declines - 20} more` : ""}`)
    }
  }

  return lines.join("\n")
}

/* ── Product Parameters ─────────────────────────────────────────────── */

function buildProductParameters(carriers: readonly Carrier[]): string {
  const lines = ["", "## Product Parameters", ""]

  for (const c of carriers) {
    if (!c.products || c.products.length === 0) continue

    const productLines = c.products.map((p) => {
      const parts = [p.name]
      if (p.ageRange) parts.push(`Ages: ${p.ageRange}`)
      if (p.faceAmountRange) parts.push(`Face: ${p.faceAmountRange}`)
      if (p.parameters?.availableTerms && p.parameters.availableTerms.length > 0) {
        parts.push(`Terms: ${p.parameters.availableTerms.join(", ")}yr`)
      }
      return parts.join(" | ")
    })

    lines.push(`- **${c.name}** (AM Best: ${c.amBest}): ${productLines.join("; ")}`)
  }

  return lines.join("\n")
}

/* ── Living Benefits ────────────────────────────────────────────────── */

function buildLivingBenefits(carriers: readonly Carrier[]): string {
  const lines = ["", "## Living Benefits & Riders", ""]

  for (const c of carriers) {
    if (!c.livingBenefitsDetail) {
      if (c.livingBenefits) {
        lines.push(`- **${c.name}**: ${c.livingBenefits}`)
      }
      continue
    }

    const lb = c.livingBenefitsDetail
    const parts: string[] = []

    if (lb.terminalIllness?.available) parts.push("Terminal Illness")
    if (lb.criticalIllness?.available) parts.push("Critical Illness")
    if (lb.chronicIllness?.available) parts.push("Chronic Illness")
    if (lb.accidentalDeathBenefit?.available) parts.push("AD&D")

    if (parts.length > 0) {
      lines.push(`- **${c.name}**: ${parts.join(", ")}`)
      if (lb.notes) lines.push(`  Note: ${lb.notes}`)
    }
  }

  return lines.join("\n")
}

/* ── Rate Class Criteria ────────────────────────────────────────────── */

function buildRateClassCriteria(carriers: readonly Carrier[]): string {
  const lines = ["", "## Rate Class Criteria", ""]

  const enriched = carriers.filter((c) => c.rateClassCriteria)

  for (const c of enriched) {
    const rc = c.rateClassCriteria!
    lines.push(`### ${c.name}`)

    for (const [className, thresholds] of Object.entries(rc)) {
      if (className === "notes" || !thresholds || typeof thresholds === "string") continue

      const t = thresholds as {
        tobaccoFreeMonths?: number | null
        bpMaxSystolic?: number | null
        bpMaxDiastolic?: number | null
        bmiMax?: number | null
        duiFreeMonths?: number | null
        otherRequirements?: string[]
        notes?: string | null
      }

      const parts: string[] = []
      if (t.tobaccoFreeMonths) parts.push(`tobacco-free ${t.tobaccoFreeMonths}mo`)
      if (t.bpMaxSystolic && t.bpMaxDiastolic) parts.push(`BP ≤${t.bpMaxSystolic}/${t.bpMaxDiastolic}`)
      if (t.bmiMax) parts.push(`BMI ≤${t.bmiMax}`)
      if (t.duiFreeMonths) parts.push(`DUI-free ${t.duiFreeMonths}mo`)
      if (t.otherRequirements) {
        for (const req of t.otherRequirements) {
          parts.push(req)
        }
      }

      if (parts.length > 0) {
        lines.push(`- **${className}**: ${parts.join("; ")}`)
      }
    }

    if (rc.notes) lines.push(`- Notes: ${rc.notes}`)
    lines.push("")
  }

  return lines.join("\n")
}

/* ── Operational Info ───────────────────────────────────────────────── */

function buildOperationalInfo(carriers: readonly Carrier[]): string {
  const lines = ["", "## Operational Info", ""]

  for (const c of carriers) {
    if (!c.operational) continue
    const o = c.operational
    const parts: string[] = []
    if (o.eSign) parts.push("E-sign available")
    if (o.telesales) parts.push("Telesales")
    if (o.paymentMethods && o.paymentMethods.length > 0) {
      parts.push(`Payment: ${o.paymentMethods.join(", ")}`)
    } else if (o.payments) {
      parts.push(`Payment: ${o.payments}`)
    }

    if (parts.length > 0) {
      lines.push(`- **${c.name}**: ${parts.join(" | ")}`)
    }
  }

  return lines.join("\n")
}

