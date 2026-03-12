/**
 * Quick SI filter test: 35M non-smoker, TX, $500K, 20yr
 * Compares ALL vs SI to confirm fewer results.
 *
 * Usage: bun scripts/test-si-quick.ts
 */

import { readFileSync } from "fs"
import { resolve } from "path"

const envPath = resolve(import.meta.dir, "../.env.local")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const t = line.trim()
  if (!t || t.startsWith("#")) continue
  const eq = t.indexOf("=")
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
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
  riskClass: string
  productName: string
}

async function runQuote(underwritingType: "all" | "si"): Promise<{ rows: RowResult[]; rawCount: number }> {
  const pricingResults = await pricingProvider.getQuotes({
    age: 35,
    gender: "Male",
    state: "Texas",
    coverageAmount: 500000,
    termLength: 20,
    tobaccoStatus: "non-smoker",
    underwritingType,
  })

  const pricesByCarrier = groupByCarrier(pricingResults)
  const rows: RowResult[] = []

  for (const carrier of CARRIERS) {
    const elig = checkEligibility(carrier, 35, "Texas", 500000, 20, {}, "term")
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
      riskClass: cheapest.riskClass ?? "?",
      productName: cheapest.productName,
    })
  }

  rows.sort((a, b) => a.monthly - b.monthly)
  return { rows, rawCount: pricingResults.length }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("  SI Filter Test: 35M Non-Smoker, TX, $500K, 20yr")
  console.log("═══════════════════════════════════════════════════════════════\n")

  console.log("Fetching ALL quotes...")
  const t0 = Date.now()
  const all = await runQuote("all")
  console.log(`  → ${all.rawCount} raw products, ${all.rows.length} matched carriers (${Date.now() - t0}ms)`)

  console.log("Fetching SI quotes...")
  const t1 = Date.now()
  const si = await runQuote("si")
  console.log(`  → ${si.rawCount} raw products, ${si.rows.length} matched carriers (${Date.now() - t1}ms)`)

  // ALL results
  console.log(`\n── ALL (no filter): ${all.rows.length} carriers ──`)
  for (let i = 0; i < all.rows.length; i++) {
    const r = all.rows[i]
    console.log(
      `  ${String(i + 1).padEnd(3)} ${r.carrier.padEnd(28)} ${fmt(r.monthly).padEnd(10)} ${r.riskClass.padEnd(20)} ${r.productName}`,
    )
  }

  // SI results
  console.log(`\n── SI ONLY: ${si.rows.length} carriers ──`)
  for (let i = 0; i < si.rows.length; i++) {
    const r = si.rows[i]
    console.log(
      `  ${String(i + 1).padEnd(3)} ${r.carrier.padEnd(28)} ${fmt(r.monthly).padEnd(10)} ${r.riskClass.padEnd(20)} ${r.productName}`,
    )
  }

  // Summary
  console.log(`\n── Summary ──`)
  console.log(`  ALL: ${all.rows.length} carriers (${all.rawCount} raw products)`)
  console.log(`  SI:  ${si.rows.length} carriers (${si.rawCount} raw products)`)

  if (si.rows.length < all.rows.length) {
    console.log(`  ✓ PASS: SI reduced from ${all.rows.length} to ${si.rows.length} carriers`)
  } else if (si.rows.length === 0) {
    console.log(`  ⚠ No SI products at $500K — SI caps may be lower`)
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
