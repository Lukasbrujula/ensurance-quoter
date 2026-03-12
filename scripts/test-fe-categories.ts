/**
 * Temporary test script: Compare Compulife categories "Y" vs "8" for Final Expense.
 * Usage: bun run scripts/test-fe-categories.ts
 */

import { CompulifePricingProvider } from "../lib/engine/compulife-provider"
import type { PricingRequest, PricingResult } from "../lib/engine/pricing"

const provider = new CompulifePricingProvider()

const baseRequest: PricingRequest = {
  age: 65,
  gender: "Female",
  state: "FL",
  coverageAmount: 20_000,
  termLength: 20,
  tobaccoStatus: "non-smoker",
  healthClassOverride: "R",
}

async function fetchCategory(category: string, label: string): Promise<PricingResult[]> {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`Fetching category "${category}" (${label})...`)
  console.log(`${"=".repeat(60)}`)

  try {
    const results = await provider.getQuotes({
      ...baseRequest,
      categoryOverride: category,
    })
    console.log(`→ ${results.length} products returned`)
    return results
  } catch (error) {
    console.error(`→ ERROR: ${error}`)
    return []
  }
}

function printSummary(label: string, results: PricingResult[]) {
  console.log(`\n--- ${label} (${results.length} products) ---`)

  const carriers = new Map<string, PricingResult[]>()
  for (const r of results) {
    const key = r.carrierId ?? r.carrierName
    const list = carriers.get(key) ?? []
    list.push(r)
    carriers.set(key, list)
  }

  console.log(`Unique carriers: ${carriers.size}`)
  console.log("\nProducts by carrier:")
  for (const [carrier, products] of [...carriers.entries()].sort()) {
    for (const p of products) {
      console.log(
        `  ${carrier.padEnd(20)} | $${p.monthlyPremium.toFixed(2).padStart(8)}/mo | ${p.productName}`
      )
    }
  }
}

async function main() {
  console.log("Test parameters:")
  console.log(`  Age: ${baseRequest.age}, Gender: ${baseRequest.gender}`)
  console.log(`  State: ${baseRequest.state}, Face: $${baseRequest.coverageAmount.toLocaleString()}`)
  console.log(`  Tobacco: ${baseRequest.tobaccoStatus}, Health: ${baseRequest.healthClassOverride}`)

  const [catY, cat8] = await Promise.all([
    fetchCategory("Y", "GIWL - Graded Benefit Whole Life"),
    fetchCategory("8", "To Age 121 Level No Lapse U/L"),
  ])

  printSummary('Category "Y"', catY)
  printSummary('Category "8"', cat8)

  console.log(`\n${"=".repeat(60)}`)
  console.log("COMPARISON")
  console.log(`${"=".repeat(60)}`)

  const catYCarriers = new Set(catY.map((r) => r.carrierId ?? r.carrierName))
  const cat8Carriers = new Set(cat8.map((r) => r.carrierId ?? r.carrierName))

  const onlyInY = [...catYCarriers].filter((c) => !cat8Carriers.has(c))
  const onlyIn8 = [...cat8Carriers].filter((c) => !catYCarriers.has(c))
  const inBoth = [...catYCarriers].filter((c) => cat8Carriers.has(c))

  console.log(`\nCarriers only in "Y": ${onlyInY.length}`)
  onlyInY.forEach((c) => console.log(`  - ${c}`))

  console.log(`\nCarriers only in "8": ${onlyIn8.length}`)
  onlyIn8.forEach((c) => console.log(`  - ${c}`))

  console.log(`\nCarriers in both: ${inBoth.length}`)
  inBoth.forEach((c) => console.log(`  - ${c}`))

  const feKeywords = ["living promise", "dignity", "guaranteed issue", "whole life", "graded", "final expense", "simplified"]

  console.log("\n--- FE-keyword matches in category Y ---")
  for (const r of catY) {
    const name = r.productName.toLowerCase()
    const matches = feKeywords.filter((kw) => name.includes(kw))
    if (matches.length > 0) {
      console.log(`  ${r.carrierName}: ${r.productName} [${matches.join(", ")}]`)
    }
  }

  console.log("\n--- FE-keyword matches in category 8 ---")
  for (const r of cat8) {
    const name = r.productName.toLowerCase()
    const matches = feKeywords.filter((kw) => name.includes(kw))
    if (matches.length > 0) {
      console.log(`  ${r.carrierName}: ${r.productName} [${matches.join(", ")}]`)
    }
  }

  console.log("\n--- All product names in category Y ---")
  catY.forEach((r) => console.log(`  ${r.productName}`))

  console.log("\n--- All product names in category 8 ---")
  cat8.forEach((r) => console.log(`  ${r.productName}`))
}

main().catch(console.error)
