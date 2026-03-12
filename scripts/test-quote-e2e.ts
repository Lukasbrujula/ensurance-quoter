/**
 * E2E tests for quote engine — calls the same logic as /api/quote directly.
 * Bypasses Clerk middleware (which blocks unauthenticated HTTP calls) but
 * exercises the full pricing pipeline: Compulife API → eligibility → scoring.
 *
 * Tests 3 scenarios:
 * 1. Standard term: 35M non-smoker, TX, $500K, 20yr
 * 2. Final Expense: 65M non-smoker, TX, $15K, category Y
 * 3. Vaper: 30M vaper, TX, $500K, 20yr (dual pricing)
 *
 * Usage: bun scripts/test-quote-e2e.ts
 */

import { CARRIERS } from "@/lib/data/carriers"
import { pricingProvider } from "@/lib/engine/pricing-config"
import type { PricingResult } from "@/lib/engine/pricing"
import {
  checkEligibility,
  checkStructuredMedicalEligibility,
  checkPrescriptionScreening,
  checkCombinationDeclines,
} from "@/lib/engine/eligibility"
import { calculateMatchScore, rankByPrice } from "@/lib/engine/match-scoring"
import { classifyTobaccoForCarrier } from "@/lib/engine/tobacco-classification"
import { mapHealthClass } from "@/lib/engine/compulife-provider"

// ── Types ───────────────────────────────────────────────────────────

interface QuoteRow {
  carrier: string
  carrierId: string
  monthly: number
  annual: number
  score: number
  source: string
  riskClass: string
  bestValue: boolean
  feType?: string
  productName?: string
  tobaccoClass?: string
  haStatus?: string
  haReason?: string
}

// ── Helpers ──────────────────────────────────────────────────────────

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

const doc: string[] = []

function section(line: string) {
  console.log(line)
  doc.push(line)
}

// ── Test 1: Standard Term ────────────────────────────────────────────

async function test1(): Promise<void> {
  section("")
  section("## Test 1 — Standard Term: 35M Non-Smoker, TX, $500K, 20yr")
  section("")

  const t0 = Date.now()
  const pricingResults = await pricingProvider.getQuotes({
    age: 35,
    gender: "Male",
    state: "Texas",
    coverageAmount: 500000,
    termLength: 20,
    tobaccoStatus: "non-smoker",
  })
  const elapsed = Date.now() - t0

  const pricesByCarrier = groupByCarrier(pricingResults)
  const healthClass = mapHealthClass({
    age: 35,
    gender: "Male",
    state: "Texas",
    coverageAmount: 500000,
    termLength: 20,
    tobaccoStatus: "non-smoker",
  })

  section(`- Compulife call: ${elapsed}ms`)
  section(`- Health class: ${healthClass}`)
  section(`- Raw results: ${pricingResults.length} products from ${pricesByCarrier.size} Compulife carriers`)

  // Run eligibility for our 38 carriers
  const eligiblePrices: Array<{ carrierId: string; monthlyPremium: number }> = []
  const rows: QuoteRow[] = []

  for (const carrier of CARRIERS) {
    const elig = checkEligibility(carrier, 35, "Texas", 500000, 20, {}, "term")
    if (!elig.isEligible || !elig.matchedProduct) continue

    const pricings = pricesByCarrier.get(carrier.id) ?? []
    if (pricings.length === 0) continue

    const cheapest = pricings.reduce((a, b) => (a.monthlyPremium < b.monthlyPremium ? a : b))
    eligiblePrices.push({ carrierId: carrier.id, monthlyPremium: cheapest.monthlyPremium })

    rows.push({
      carrier: carrier.name,
      carrierId: carrier.id,
      monthly: cheapest.monthlyPremium,
      annual: cheapest.annualPremium,
      score: 0,
      source: cheapest.source ?? "?",
      riskClass: cheapest.riskClass ?? "?",
      bestValue: false,
    })
  }

  // Scoring
  const priceRanks = rankByPrice(eligiblePrices)
  let minPrice = Infinity
  let bestIdx = -1

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const carrier = CARRIERS.find((c) => c.id === r.carrierId)!
    r.score = calculateMatchScore({
      carrier,
      tobaccoStatus: "non-smoker",
      isStateEligible: true,
      priceRank: priceRanks.get(carrier.id) ?? 999,
      productType: "term",
    })
    if (r.monthly > 0 && r.monthly < minPrice) {
      minPrice = r.monthly
      bestIdx = i
    }
  }
  if (bestIdx >= 0) rows[bestIdx].bestValue = true

  const compulife = rows.filter((r) => r.source === "compulife")
  const notCompulife = rows.filter((r) => r.source !== "compulife")

  section(`- Eligible carriers (our 38): ${rows.length}`)
  section(`- Compulife-sourced: ${compulife.length}`)
  section(`- Non-Compulife: ${notCompulife.length} ${notCompulife.length > 0 ? "**PROBLEM — mock data!**" : "(all Compulife)"}`)
  section("")

  // Sort by price
  rows.sort((a, b) => a.monthly - b.monthly)

  section("### Top 3 cheapest")
  section("")
  section("| # | Carrier | Monthly | Annual | Score | Source | Risk Class |")
  section("|---|---------|---------|--------|-------|--------|------------|")
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const r = rows[i]
    const bv = r.bestValue ? " *" : ""
    section(`| ${i + 1} | ${r.carrier}${bv} | ${fmt(r.monthly)} | ${fmt(r.annual)} | ${r.score} | ${r.source} | ${r.riskClass} |`)
  }

  // Console table for all
  console.log(`\n  All ${rows.length} eligible carriers by price:`)
  console.log("  " + "-".repeat(95))
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const bv = r.bestValue ? " *BEST*" : ""
    console.log(
      `  ${String(i + 1).padEnd(3)} ${r.carrier.padEnd(28)} ${fmt(r.monthly).padEnd(10)} ${fmt(r.annual).padEnd(12)} ${String(r.score).padEnd(6)} ${r.source.padEnd(10)} ${r.riskClass}${bv}`,
    )
  }
}

// ── Test 2: Final Expense ────────────────────────────────────────────

async function test2(): Promise<void> {
  section("")
  section("## Test 2 — Final Expense: 65M Non-Smoker, TX, $15K")
  section("")

  const t0 = Date.now()
  const feResults = await pricingProvider.getQuotes({
    age: 65,
    gender: "Male",
    state: "Texas",
    coverageAmount: 15000,
    termLength: 20,
    tobaccoStatus: "non-smoker",
    categoryOverride: "Y",
    healthClassOverride: "R",
  })
  const elapsed = Date.now() - t0

  section(`- Compulife call: ${elapsed}ms`)
  section(`- Category: Y (Final Expense)`)
  section(`- Raw results: ${feResults.length} products`)

  const rows: QuoteRow[] = []

  for (const pricing of feResults) {
    const matchedCarrier = CARRIERS.find((c) => c.id === pricing.carrierId)
    const productNameLower = pricing.productName.toLowerCase()
    const feType: string =
      productNameLower.includes("guaranteed issue") || productNameLower.includes("guaranteed acceptance")
        ? "guaranteed-issue"
        : productNameLower.includes("graded")
          ? "graded"
          : "level"

    rows.push({
      carrier: matchedCarrier?.name ?? pricing.carrierName,
      carrierId: pricing.carrierId,
      monthly: pricing.monthlyPremium,
      annual: pricing.annualPremium,
      score: 0,
      source: pricing.source ?? "?",
      riskClass: pricing.riskClass ?? "?",
      bestValue: false,
      feType,
      productName: pricing.productName,
    })
  }

  rows.sort((a, b) => a.monthly - b.monthly)

  // Mark best value
  if (rows.length > 0) rows[0].bestValue = true

  const level = rows.filter((r) => r.feType === "level")
  const graded = rows.filter((r) => r.feType === "graded")
  const gi = rows.filter((r) => r.feType === "guaranteed-issue")
  const mapped = rows.filter((r) => CARRIERS.some((c) => c.id === r.carrierId))

  section(`- Product types: Level=${level.length}, Graded=${graded.length}, Guaranteed Issue=${gi.length}`)
  section(`- Mapped to our carriers: ${mapped.length} of ${rows.length}`)
  section(`- All Compulife-sourced: ${rows.every((r) => r.source === "compulife") ? "YES" : "NO"}`)
  section("")

  // Top 3
  section("### Top 3 cheapest FE")
  section("")
  section("| # | Carrier | Product | Monthly | Type | Source |")
  section("|---|---------|---------|---------|------|--------|")
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const r = rows[i]
    section(`| ${i + 1} | ${r.carrier} | ${r.productName} | ${fmt(r.monthly)} | ${r.feType} | ${r.source} |`)
  }

  // All products
  section("")
  section("### All FE products")
  section("")
  section("| Carrier | Product | Monthly | Type | Mapped? |")
  section("|---------|---------|---------|------|---------|")
  for (const r of rows) {
    const isMapped = CARRIERS.some((c) => c.id === r.carrierId) ? "YES" : "no"
    section(`| ${r.carrier} | ${r.productName} | ${fmt(r.monthly)} | ${r.feType} | ${isMapped} |`)
  }

  // Console table
  console.log(`\n  All ${rows.length} FE products by price:`)
  console.log("  " + "-".repeat(110))
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const mapped = CARRIERS.some((c) => c.id === r.carrierId) ? "YES" : " no"
    console.log(
      `  ${String(i + 1).padEnd(3)} ${r.carrier.padEnd(22)} ${fmt(r.monthly).padEnd(10)} ${(r.feType ?? "?").padEnd(18)} ${mapped.padEnd(5)} ${r.productName}`,
    )
  }
}

// ── Test 3: Vaper ────────────────────────────────────────────────────

async function test3(): Promise<void> {
  section("")
  section("## Test 3 — Vaper: 30M Vaper, TX, $500K, 20yr")
  section("")

  const t0 = Date.now()
  const [smokerResults, nonSmokerResults] = await Promise.all([
    pricingProvider.getQuotes({
      age: 30, gender: "Male", state: "Texas",
      coverageAmount: 500000, termLength: 20, tobaccoStatus: "smoker",
    }),
    pricingProvider.getQuotes({
      age: 30, gender: "Male", state: "Texas",
      coverageAmount: 500000, termLength: 20, tobaccoStatus: "non-smoker",
    }),
  ])
  const elapsed = Date.now() - t0

  const smokerMap = groupByCarrier(smokerResults)
  const nonSmokerMap = groupByCarrier(nonSmokerResults)

  section(`- Dual Compulife calls: ${elapsed}ms`)
  section(`- Smoker results: ${smokerResults.length} products (${smokerMap.size} carriers)`)
  section(`- Non-smoker results: ${nonSmokerResults.length} products (${nonSmokerMap.size} carriers)`)

  // For each carrier, pick rate based on tobacco classification for vaping
  const rows: QuoteRow[] = []
  const eligiblePrices: Array<{ carrierId: string; monthlyPremium: number }> = []

  const nsCarrierIds: string[] = []
  const sCarrierIds: string[] = []

  for (const carrier of CARRIERS) {
    const classification = classifyTobaccoForCarrier("vaping", carrier)
    const elig = checkEligibility(carrier, 30, "Texas", 500000, 20, {}, "term")
    if (!elig.isEligible || !elig.matchedProduct) continue

    const sourceMap = classification === "non-smoker" ? nonSmokerMap : smokerMap
    const pricings = sourceMap.get(carrier.id) ?? []
    if (pricings.length === 0) continue

    const cheapest = pricings.reduce((a, b) => (a.monthlyPremium < b.monthlyPremium ? a : b))
    eligiblePrices.push({ carrierId: carrier.id, monthlyPremium: cheapest.monthlyPremium })

    if (classification === "non-smoker") nsCarrierIds.push(carrier.id)
    else sCarrierIds.push(carrier.id)

    rows.push({
      carrier: carrier.name,
      carrierId: carrier.id,
      monthly: cheapest.monthlyPremium,
      annual: cheapest.annualPremium,
      score: 0,
      source: cheapest.source ?? "?",
      riskClass: cheapest.riskClass ?? "?",
      bestValue: false,
      tobaccoClass: classification,
    })
  }

  // Scoring
  const priceRanks = rankByPrice(eligiblePrices)
  let minPrice = Infinity
  let bestIdx = -1

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const carrier = CARRIERS.find((c) => c.id === r.carrierId)!
    r.score = calculateMatchScore({
      carrier,
      tobaccoStatus: "smoker",
      nicotineType: "vaping",
      isStateEligible: true,
      priceRank: priceRanks.get(carrier.id) ?? 999,
      productType: "term",
    })
    if (r.monthly > 0 && r.monthly < minPrice) {
      minPrice = r.monthly
      bestIdx = i
    }
  }
  if (bestIdx >= 0) rows[bestIdx].bestValue = true

  section(`- Carriers with NON-SMOKER rates for vaping: ${nsCarrierIds.length}`)
  section(`- Carriers with SMOKER rates for vaping: ${sCarrierIds.length}`)
  section("")

  // List non-smoker carriers
  section("### Carriers giving NON-SMOKER rates for vaping")
  section("")
  for (const id of nsCarrierIds) {
    const carrier = CARRIERS.find((c) => c.id === id)!
    section(`- **${carrier.name}**: "${carrier.tobacco.vaping}"`)
  }

  // Foresters analysis
  const foresters = rows.find((r) => r.carrierId === "foresters")
  const nonForestersSmoker = rows
    .filter((r) => r.carrierId !== "foresters" && r.tobaccoClass === "smoker")
    .sort((a, b) => a.monthly - b.monthly)

  section("")
  section("### Foresters vape-friendly check")
  section("")

  if (foresters) {
    section(`- Foresters classification: **${foresters.tobaccoClass?.toUpperCase()}**`)
    section(`- Foresters price: **${fmt(foresters.monthly)}/mo** (${fmt(foresters.annual)}/yr)`)
    section(`- Risk class: ${foresters.riskClass}`)
    section(`- Match score: ${foresters.score}`)

    if (nonForestersSmoker.length > 0) {
      const cheapestSmoker = nonForestersSmoker[0]
      const medianIdx = Math.floor(nonForestersSmoker.length / 2)
      const medianSmoker = nonForestersSmoker[medianIdx]

      const savingsVsMedian = ((1 - foresters.monthly / medianSmoker.monthly) * 100).toFixed(0)
      const savingsVsCheapest = ((1 - foresters.monthly / cheapestSmoker.monthly) * 100).toFixed(0)

      section("")
      section("### Pricing comparison")
      section("")
      section("| | Carrier | Monthly | Rate Type |")
      section("|---|---------|---------|-----------|")
      section(`| Foresters | Foresters Financial | ${fmt(foresters.monthly)} | NON-SMOKER (vape-friendly) |`)
      section(`| Cheapest smoker | ${cheapestSmoker.carrier} | ${fmt(cheapestSmoker.monthly)} | SMOKER |`)
      section(`| Median smoker | ${medianSmoker.carrier} | ${fmt(medianSmoker.monthly)} | SMOKER |`)
      section("")
      section(`- Savings vs cheapest smoker: **${savingsVsCheapest}%**`)
      section(`- Savings vs median smoker: **${savingsVsMedian}%**`)

      const confirmed = foresters.monthly < cheapestSmoker.monthly
      section(`- **Non-smoker rate confirmed: ${confirmed ? "YES" : "UNCLEAR — Foresters not cheaper than cheapest smoker"}**`)
    }
  } else {
    section("**Foresters: NOT FOUND or not eligible — PROBLEM!**")
  }

  // Top 10 by price
  rows.sort((a, b) => a.monthly - b.monthly)
  section("")
  section("### Top 10 by price")
  section("")
  section("| # | Carrier | Monthly | Rate Type | Score | Risk Class |")
  section("|---|---------|---------|-----------|-------|------------|")
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i]
    const bv = r.bestValue ? " *" : ""
    section(`| ${i + 1} | ${r.carrier}${bv} | ${fmt(r.monthly)} | ${r.tobaccoClass?.toUpperCase()} | ${r.score} | ${r.riskClass} |`)
  }

  // Console comparison
  console.log(`\n  All ${rows.length} carriers by price:`)
  console.log("  " + "-".repeat(105))
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const tag = r.carrierId === "foresters" ? " <<FORESTERS>>" : ""
    const cls = (r.tobaccoClass === "non-smoker" ? "NS" : "SM").padEnd(4)
    console.log(
      `  ${String(i + 1).padEnd(3)} ${r.carrier.padEnd(28)} ${fmt(r.monthly).padEnd(10)} ${cls} ${String(r.score).padEnd(6)} ${r.riskClass.padEnd(18)}${tag}`,
    )
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════╗")
  console.log("║  Quote Engine E2E Test — 3 Scenarios                            ║")
  console.log("║  Direct engine calls (bypasses Clerk middleware)                 ║")
  console.log("║  Full Compulife API → eligibility → scoring pipeline            ║")
  console.log("╚══════════════════════════════════════════════════════════════════╝\n")

  section("# Compulife E2E Quote Test Results")
  section("")
  section(`**Run:** ${new Date().toISOString()}`)
  section(`**Provider:** ${pricingProvider.name}`)
  section(`**Carriers in system:** ${CARRIERS.length}`)

  try {
    await test1()
  } catch (err) {
    section(`\n**Test 1 FAILED:** ${err}`)
    console.error("Test 1 failed:", err)
  }

  try {
    await test2()
  } catch (err) {
    section(`\n**Test 2 FAILED:** ${err}`)
    console.error("Test 2 failed:", err)
  }

  try {
    await test3()
  } catch (err) {
    section(`\n**Test 3 FAILED:** ${err}`)
    console.error("Test 3 failed:", err)
  }

  // Write results
  await Bun.write("docs/COMPULIFE_EXPLORATION_RESULTS.md", doc.join("\n") + "\n")
  console.log("\n\nResults written to docs/COMPULIFE_EXPLORATION_RESULTS.md")
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
