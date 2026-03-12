/**
 * Quick test: Standard term 35M non-smoker TX $500K 20yr with underwritingType "si"
 * Compares against "all" to confirm fewer results come back.
 *
 * Usage: bun scripts/test-si-filter.ts
 */

// Load .env.local so Compulife credentials are available
import { readFileSync } from "fs"
import { resolve } from "path"

const envPath = resolve(import.meta.dir, "../.env.local")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eqIdx = trimmed.indexOf("=")
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx)
  const value = trimmed.slice(eqIdx + 1)
  if (!process.env[key]) {
    process.env[key] = value
  }
}

import { CARRIERS } from "@/lib/data/carriers"
import { pricingProvider } from "@/lib/engine/pricing-config"
import type { PricingResult } from "@/lib/engine/pricing"
import { checkEligibility } from "@/lib/engine/eligibility"

function groupByCarrier(results: PricingResult[]): Map<string, PricingResult[]> {
  const map = new Map<string, PricingResult[]>()
  for (const r of results) {
    const existing = map.get(r.carrierId)
    if (existing) existing.push(r)
    else map.set(r.carrierId, [r])
  }
  return map
}

function fmt(n: number): string {
  return "$" + n.toFixed(2)
}

interface RowResult {
  carrier: string
  carrierId: string
  monthly: number
  annual: number
  riskClass: string
  productName: string
}

async function runQuote(underwritingType: "all" | "si", coverageAmount = 500000): Promise<RowResult[]> {
  const pricingResults = await pricingProvider.getQuotes({
    age: 35,
    gender: "Male",
    state: "Texas",
    coverageAmount,
    termLength: 20,
    tobaccoStatus: "non-smoker",
    underwritingType,
  })

  const pricesByCarrier = groupByCarrier(pricingResults)
  const rows: RowResult[] = []

  for (const carrier of CARRIERS) {
    const elig = checkEligibility(carrier, 35, "Texas", coverageAmount, 20, {}, "term")
    if (!elig.isEligible || !elig.matchedProduct) continue

    const pricings = pricesByCarrier.get(carrier.id) ?? []
    if (pricings.length === 0) continue

    const cheapest = pricings.reduce((a, b) =>
      a.monthlyPremium < b.monthlyPremium ? a : b,
    )

    rows.push({
      carrier: carrier.name,
      carrierId: carrier.id,
      monthly: cheapest.monthlyPremium,
      annual: cheapest.annualPremium,
      riskClass: cheapest.riskClass ?? "?",
      productName: cheapest.productName,
    })
  }

  rows.sort((a, b) => a.monthly - b.monthly)
  return rows
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("  SI Filter Test: 35M Non-Smoker, TX, $500K, 20yr")
  console.log("  + Retry at $250K (SI products often cap at lower amounts)")
  console.log("═══════════════════════════════════════════════════════════════\n")

  const t0 = Date.now()
  console.log("Fetching ALL quotes ($500K)...")
  const allRows = await runQuote("all")
  console.log(`  → ${allRows.length} carriers`)

  console.log("Fetching SI quotes ($500K)...")
  const siRows = await runQuote("si")
  console.log(`  → ${siRows.length} carriers`)

  console.log("Fetching ALL quotes ($250K)...")
  const allRows250 = await runQuote("all", 250000)
  console.log(`  → ${allRows250.length} carriers`)

  console.log("Fetching SI quotes ($250K)...")
  const siRows250 = await runQuote("si", 250000)
  console.log(`  → ${siRows250.length} carriers`)

  const elapsed = Date.now() - t0
  console.log(`\nCompulife calls: ${elapsed}ms (sequential)\n`)

  function printComparison(label: string, all: RowResult[], si: RowResult[]) {
    console.log(`\n══ ${label} ══`)

    console.log(`\n── ALL (no filter): ${all.length} carriers ──`)
    console.log("  " + "-".repeat(90))
    for (let i = 0; i < all.length; i++) {
      const r = all[i]
      console.log(
        `  ${String(i + 1).padEnd(3)} ${r.carrier.padEnd(28)} ${fmt(r.monthly).padEnd(10)} ${r.riskClass.padEnd(18)} ${r.productName}`,
      )
    }

    console.log(`\n── SI ONLY: ${si.length} carriers ──`)
    console.log("  " + "-".repeat(90))
    for (let i = 0; i < si.length; i++) {
      const r = si[i]
      console.log(
        `  ${String(i + 1).padEnd(3)} ${r.carrier.padEnd(28)} ${fmt(r.monthly).padEnd(10)} ${r.riskClass.padEnd(18)} ${r.productName}`,
      )
    }

    const siIds = new Set(si.map((r) => r.carrierId))
    const removed = all.filter((r) => !siIds.has(r.carrierId))

    console.log(`\n── Summary ──`)
    console.log(`  ALL carriers:  ${all.length}`)
    console.log(`  SI carriers:   ${si.length}`)
    console.log(`  Reduction:     ${all.length - si.length} carriers removed`)

    if (removed.length > 0) {
      console.log(`\n  Carriers in ALL but NOT in SI:`)
      for (const r of removed) {
        console.log(`    - ${r.carrier} (${r.carrierId}) — ${fmt(r.monthly)}/mo — ${r.productName}`)
      }
    }

    if (si.length < all.length) {
      console.log(`\n  ✓ PASS: SI filter reduced carrier count from ${all.length} to ${si.length}`)
    } else if (si.length === 0 && all.length > 0) {
      console.log(`\n  ⚠ NOTE: No SI products available at this coverage amount`)
    } else if (si.length === all.length) {
      console.log(`\n  ⚠ SAME: SI returned same count as ALL`)
    }
  }

  printComparison("$500K Coverage", allRows, siRows)
  printComparison("$250K Coverage", allRows250, siRows250)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
