/* ------------------------------------------------------------------ */
/*  Medication Screening Engine                                        */
/*  Screens medication names against MEDICATIONS database               */
/*  and returns per-carrier eligibility results.                       */
/* ------------------------------------------------------------------ */

import {
  MEDICATIONS,
  type MedicationEntry,
  type MedicationCarrierEligibility,
} from "@/lib/data/medications"
import { CARRIERS } from "@/lib/data/carriers"

/* ── Types ──────────────────────────────────────────────────────────── */

export interface MedicationScreenResult {
  medication: string
  matchedEntry: string
  carrierId: string
  carrierName: string
  action: "accept" | "decline" | "conditional" | "unknown" | "no_data"
  detail?: string
  condition: string
  severity: "low" | "moderate" | "high"
}

export interface CarrierMedicationSummary {
  carrierId: string
  carrierName: string
  declinedMedications: string[]
  conditionalMedications: string[]
  acceptedMedications: string[]
  noData: boolean
}

export interface MedicationWarning {
  medication: string
  condition: string
  action: "decline" | "conditional"
  detail?: string
  severity: "low" | "moderate" | "high"
}

/* ── Carrier name lookup ────────────────────────────────────────────── */

const CARRIER_NAME_MAP = new Map(
  CARRIERS.map((c) => [c.id, c.name]),
)

function getCarrierName(carrierId: string): string {
  return CARRIER_NAME_MAP.get(carrierId) ?? carrierId
}

/* ── Matching ───────────────────────────────────────────────────────── */

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

function findMedicationMatch(input: string): MedicationEntry | null {
  const normalized = normalizeText(input)
  if (!normalized) return null

  // Exact name match first
  for (const entry of MEDICATIONS) {
    if (normalizeText(entry.name) === normalized) return entry
  }

  // Exact alias match
  for (const entry of MEDICATIONS) {
    for (const alias of entry.aliases) {
      if (normalizeText(alias) === normalized) return entry
    }
  }

  // Partial match on name (e.g., "metformin" matches "metformin hydrochloride")
  for (const entry of MEDICATIONS) {
    if (normalizeText(entry.name).includes(normalized)) return entry
    if (normalized.includes(normalizeText(entry.name))) return entry
  }

  // Partial match on aliases
  for (const entry of MEDICATIONS) {
    for (const alias of entry.aliases) {
      if (normalizeText(alias).includes(normalized)) return entry
      if (normalized.includes(normalizeText(alias))) return entry
    }
  }

  return null
}

/* ── Parsing ────────────────────────────────────────────────────────── */

function parseMedicationText(text: string): string[] {
  return text
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/* ── Screening ──────────────────────────────────────────────────────── */

/**
 * Screen a single medication against all carriers with published Rx data.
 */
export function screenMedication(
  medicationName: string,
): MedicationScreenResult[] {
  const entry = findMedicationMatch(medicationName)
  if (!entry) return []

  return entry.carrierResults.map(
    (cr: MedicationCarrierEligibility): MedicationScreenResult => ({
      medication: medicationName,
      matchedEntry: entry.name,
      carrierId: cr.carrierId,
      carrierName: getCarrierName(cr.carrierId),
      action: cr.result,
      detail: cr.detail,
      condition: entry.condition,
      severity: entry.severity,
    }),
  )
}

/**
 * Screen multiple medications (comma-separated text), return per-carrier summaries.
 */
export function screenMedications(
  medicationText: string,
): CarrierMedicationSummary[] {
  const medications = parseMedicationText(medicationText)
  if (medications.length === 0) return []

  // Collect all results
  const allResults: MedicationScreenResult[] = []
  for (const med of medications) {
    allResults.push(...screenMedication(med))
  }

  // Group by carrier
  const carrierMap = new Map<string, MedicationScreenResult[]>()
  for (const r of allResults) {
    const existing = carrierMap.get(r.carrierId) ?? []
    carrierMap.set(r.carrierId, [...existing, r])
  }

  // Build carrier IDs we have data for
  const carrierIdsWithData = new Set(carrierMap.keys())

  // Build summaries for all carriers
  const summaries: CarrierMedicationSummary[] = CARRIERS.map((carrier) => {
    const results = carrierMap.get(carrier.id)

    if (!results || results.length === 0) {
      return {
        carrierId: carrier.id,
        carrierName: carrier.name,
        declinedMedications: [],
        conditionalMedications: [],
        acceptedMedications: [],
        noData: !carrierIdsWithData.has(carrier.id),
      }
    }

    const declined: string[] = []
    const conditional: string[] = []
    const accepted: string[] = []

    for (const r of results) {
      if (r.action === "decline") declined.push(r.medication)
      else if (r.action === "conditional") conditional.push(r.medication)
      else if (r.action === "accept") accepted.push(r.medication)
    }

    return {
      carrierId: carrier.id,
      carrierName: carrier.name,
      declinedMedications: [...new Set(declined)],
      conditionalMedications: [...new Set(conditional)],
      acceptedMedications: [...new Set(accepted)],
      noData: false,
    }
  })

  return summaries
}

/**
 * Get medication warnings for a specific carrier based on medication text.
 * Returns only decline/conditional results.
 */
export function getMedicationWarnings(
  medicationText: string,
  carrierId: string,
): MedicationWarning[] {
  const medications = parseMedicationText(medicationText)
  if (medications.length === 0) return []

  const warnings: MedicationWarning[] = []

  for (const med of medications) {
    const entry = findMedicationMatch(med)
    if (!entry) continue

    const carrierResult = entry.carrierResults.find(
      (cr) => cr.carrierId === carrierId,
    )
    if (!carrierResult) continue

    if (
      carrierResult.result === "decline" ||
      carrierResult.result === "conditional"
    ) {
      warnings.push({
        medication: entry.name,
        condition: entry.condition,
        action: carrierResult.result,
        detail: carrierResult.detail,
        severity: entry.severity,
      })
    }
  }

  return warnings
}

/**
 * Autocomplete: find medication entries matching a partial input.
 */
export function suggestMedications(
  partial: string,
  limit = 8,
): Array<{ name: string; aliases: readonly string[]; condition: string }> {
  const normalized = normalizeText(partial)
  if (normalized.length < 2) return []

  const results: Array<{
    name: string
    aliases: readonly string[]
    condition: string
    score: number
  }> = []

  for (const entry of MEDICATIONS) {
    const entryName = normalizeText(entry.name)

    // Starts-with on name gets highest priority
    if (entryName.startsWith(normalized)) {
      results.push({
        name: entry.name,
        aliases: entry.aliases,
        condition: entry.condition,
        score: 0,
      })
      continue
    }

    // Starts-with on alias
    let aliasMatch = false
    for (const alias of entry.aliases) {
      if (normalizeText(alias).startsWith(normalized)) {
        results.push({
          name: entry.name,
          aliases: entry.aliases,
          condition: entry.condition,
          score: 1,
        })
        aliasMatch = true
        break
      }
    }
    if (aliasMatch) continue

    // Contains match
    if (entryName.includes(normalized)) {
      results.push({
        name: entry.name,
        aliases: entry.aliases,
        condition: entry.condition,
        score: 2,
      })
    }
  }

  return results
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ name, aliases, condition }) => ({ name, aliases, condition }))
}
