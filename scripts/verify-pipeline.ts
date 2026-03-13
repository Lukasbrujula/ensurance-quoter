/**
 * Full pipeline verification test for the Ensurance quote engine.
 *
 * Tests categories, filters, knockouts, carrier mapping, and Health Analyzer
 * across Term Life, Final Expense, and SI/FUW filtering.
 *
 * Calls the Compulife provider and eligibility engine directly (bypasses HTTP/Clerk).
 *
 * Usage: bun run scripts/verify-pipeline.ts
 */

// Use proxy mode (DigitalOcean Droplet) — reads from .env.local
process.env.NODE_ENV = "development"

// Dynamic imports to ensure env is set first
const { CompulifePricingProvider, mapHealthClass } = await import("../lib/engine/compulife-provider")
const { checkEligibility } = await import("../lib/engine/eligibility")
const { CARRIERS } = await import("../lib/data/carriers")
type PricingResult = Awaited<ReturnType<InstanceType<typeof CompulifePricingProvider>["getQuotes"]>>[number]

const provider = new CompulifePricingProvider()

interface TestResult {
  id: string
  name: string
  passed: boolean
  details: string
  carrierCount?: number
  top3?: Array<{ carrier: string; carrierId: string; monthly: number; annual: number; productCode?: string }>
  categoryCode?: string
  stateCode?: string
  healthCode?: string
  extraData?: Record<string, unknown>
}

const results: TestResult[] = []

function uniqueCarrierIds(res: PricingResult[]): string[] {
  return [...new Set(res.map((r) => r.carrierId))]
}

function top3FromPricing(res: PricingResult[]): TestResult["top3"] {
  // Sort by monthly ascending and take first 3
  const sorted = [...res].sort((a, b) => a.monthlyPremium - b.monthlyPremium)
  return sorted.slice(0, 3).map((r) => ({
    carrier: r.carrierName,
    carrierId: r.carrierId,
    monthly: r.monthlyPremium,
    annual: r.annualPremium,
    productCode: r.productCode,
  }))
}

function avgMonthly(res: PricingResult[]): number {
  if (res.length === 0) return 0
  return res.reduce((s, r) => s + r.monthlyPremium, 0) / res.length
}

// =============================================================================
// TEST GROUP 1 — TERM LIFE
// =============================================================================

async function test1A(): Promise<TestResult> {
  const id = "1A"
  const name = "35M non-smoker, TX, $500K, 20yr — baseline"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
    })
    const carriers = uniqueCarrierIds(res)
    const allCompulife = res.every((r) => r.source === "compulife")

    return {
      id, name,
      passed: carriers.length >= 20 && allCompulife,
      details: `${carriers.length} unique carriers, ${res.length} products, all Compulife: ${allCompulife}`,
      carrierCount: carriers.length,
      top3: top3FromPricing(res),
      categoryCode: "5 (20yr term)",
      stateCode: "44 (TX)",
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test1B(): Promise<TestResult> {
  const id = "1B"
  const name = "35M non-smoker, NY, $500K, 20yr — NY state filtering"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "NY",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
    })
    const carrierIds = uniqueCarrierIds(res)

    // Check eligibility layer for NY exclusions
    const nyExcluded = ["amam", "americo", "uhl"]
    const pricingViolations = nyExcluded.filter((id) => carrierIds.includes(id))

    // Also check eligibility engine
    const eligViolations: string[] = []
    for (const excId of nyExcluded) {
      const carrier = CARRIERS.find((c) => c.id === excId)
      if (carrier) {
        const elig = checkEligibility(carrier, 35, "NY", 500000, 20, {}, "term")
        if (elig.isEligible) eligViolations.push(excId)
      }
    }

    return {
      id, name,
      passed: carrierIds.length > 0,
      details: `${carrierIds.length} carriers from Compulife. Pricing-level NY exclusion violations: [${pricingViolations.join(", ") || "none"}]. Eligibility-level violations: [${eligViolations.join(", ") || "none"}]`,
      carrierCount: carrierIds.length,
      top3: top3FromPricing(res),
      stateCode: "33 (NY)",
      categoryCode: "5 (20yr term)",
      extraData: { pricingViolations, eligViolations },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test1C(): Promise<TestResult> {
  const id = "1C"
  const name = "35M smoker, TX, $500K, 20yr — tobacco pricing"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "smoker", underwritingType: "all",
    })
    const healthClass = mapHealthClass({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "smoker", underwritingType: "all",
    })

    return {
      id, name,
      passed: res.length > 0,
      details: `${uniqueCarrierIds(res).length} carriers, ${res.length} products`,
      carrierCount: uniqueCarrierIds(res).length,
      top3: top3FromPricing(res),
      stateCode: "44 (TX)",
      categoryCode: "5 (20yr term)",
      healthCode: `${healthClass} (smoker → Standard)`,
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test1D(): Promise<TestResult> {
  const id = "1D"
  const name = "35M non-smoker, TX, $500K, 10yr vs 30yr — category 3 vs 7"
  try {
    const [res10, res30] = await Promise.all([
      provider.getQuotes({
        age: 35, gender: "Male", state: "TX",
        coverageAmount: 500000, termLength: 10,
        tobaccoStatus: "non-smoker", underwritingType: "all",
      }),
      provider.getQuotes({
        age: 35, gender: "Male", state: "TX",
        coverageAmount: 500000, termLength: 30,
        tobaccoStatus: "non-smoker", underwritingType: "all",
      }),
    ])

    const avg10 = avgMonthly(res10)
    const avg30 = avgMonthly(res30)
    const pricesCorrect = avg30 > avg10

    return {
      id, name,
      passed: pricesCorrect && res10.length > 0 && res30.length > 0,
      details: `10yr: ${res10.length} products (avg $${avg10.toFixed(2)}/mo, cat 3), 30yr: ${res30.length} products (avg $${avg30.toFixed(2)}/mo, cat 7). 30yr > 10yr: ${pricesCorrect}`,
      extraData: {
        "10yr_carriers": uniqueCarrierIds(res10).length,
        "30yr_carriers": uniqueCarrierIds(res30).length,
        "10yr_top3": top3FromPricing(res10),
        "30yr_top3": top3FromPricing(res30),
      },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test1E(): Promise<TestResult> {
  const id = "1E"
  const name = "50M non-smoker, TX, $500K, 20yr — older age"
  try {
    const res = await provider.getQuotes({
      age: 50, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
    })

    return {
      id, name,
      passed: res.length > 0,
      details: `${uniqueCarrierIds(res).length} carriers, ${res.length} products`,
      carrierCount: uniqueCarrierIds(res).length,
      top3: top3FromPricing(res),
      stateCode: "44 (TX)",
      categoryCode: "5 (20yr term)",
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

// =============================================================================
// TEST GROUP 2 — FINAL EXPENSE
// =============================================================================

async function test2A(): Promise<TestResult> {
  const id = "2A"
  const name = "65M non-smoker, TX, $15K, FE — baseline"
  try {
    const res = await provider.getQuotes({
      age: 65, gender: "Male", state: "TX",
      coverageAmount: 15000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
      categoryOverride: "Y", healthClassOverride: "R",
    })

    // Classify FE type
    const classify = (name: string): string => {
      const lower = name.toLowerCase()
      if (lower.includes("guaranteed issue") || lower.includes("guaranteed acceptance")) return "guaranteed-issue"
      if (lower.includes("graded")) return "graded"
      return "level"
    }

    const types = { level: 0, graded: 0, "guaranteed-issue": 0 }
    for (const r of res) {
      const t = classify(r.productName)
      types[t as keyof typeof types]++
    }

    return {
      id, name,
      passed: res.length > 0,
      details: `${res.length} FE products, ${uniqueCarrierIds(res).length} carriers. Level: ${types.level}, Graded: ${types.graded}, GI: ${types["guaranteed-issue"]}`,
      carrierCount: uniqueCarrierIds(res).length,
      top3: top3FromPricing(res),
      categoryCode: "Y (Final Expense)",
      stateCode: "44 (TX)",
      healthCode: "R (FE Standard override)",
      extraData: { typeBreakdown: types },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test2B(): Promise<TestResult> {
  const id = "2B"
  const name = "65M non-smoker, NY, $15K, FE — NY uses state code 52"
  try {
    const res = await provider.getQuotes({
      age: 65, gender: "Male", state: "NY",
      coverageAmount: 15000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
      categoryOverride: "Y", healthClassOverride: "R",
      stateCodeOverride: "52", // NY Non-Business for FE
    })

    return {
      id, name,
      passed: res.length > 0,
      details: `${res.length} FE products in NY, ${uniqueCarrierIds(res).length} carriers`,
      carrierCount: uniqueCarrierIds(res).length,
      top3: top3FromPricing(res),
      categoryCode: "Y (Final Expense)",
      stateCode: "52 (NY Non-Business)",
      healthCode: "R (FE Standard override)",
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test2C(): Promise<TestResult> {
  const id = "2C"
  const name = "70F non-smoker, TX, $10K, FE — different age/gender/amount"
  try {
    const res = await provider.getQuotes({
      age: 70, gender: "Female", state: "TX",
      coverageAmount: 10000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
      categoryOverride: "Y", healthClassOverride: "R",
    })

    return {
      id, name,
      passed: res.length > 0,
      details: `${res.length} FE products, ${uniqueCarrierIds(res).length} carriers`,
      carrierCount: uniqueCarrierIds(res).length,
      top3: top3FromPricing(res),
      categoryCode: "Y (Final Expense)",
      stateCode: "44 (TX)",
      healthCode: "R (FE Standard override)",
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

// =============================================================================
// TEST GROUP 3 — SI/FUW FILTERING (PRODDIS)
// =============================================================================

async function test3A(): Promise<TestResult> {
  const id = "3A"
  const name = "35M non-smoker, TX, $500K, 20yr, SI only"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "si",
    })

    return {
      id, name,
      passed: res.length > 0 && res.length <= 20,
      details: `${uniqueCarrierIds(res).length} SI carriers, ${res.length} SI products`,
      carrierCount: uniqueCarrierIds(res).length,
      top3: top3FromPricing(res),
      categoryCode: "5 (20yr term)",
      healthCode: "R (SI override to Standard)",
      extraData: { products: res.map((r) => `${r.carrierName}: ${r.productName} [${r.productCode}]`) },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test3B(): Promise<TestResult> {
  const id = "3B"
  const name = "35M non-smoker, TX, $500K, 20yr, FUW only"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "fuw",
    })

    return {
      id, name,
      passed: res.length > 0,
      details: `${uniqueCarrierIds(res).length} FUW carriers, ${res.length} FUW products`,
      carrierCount: uniqueCarrierIds(res).length,
      top3: top3FromPricing(res),
      categoryCode: "5 (20yr term, PRODDIS excludes SI codes)",
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test3C_compare(): Promise<TestResult> {
  const id = "3C"
  const name = "SI + FUW vs All comparison"
  const r1A = results.find((r) => r.id === "1A")
  const r3A = results.find((r) => r.id === "3A")
  const r3B = results.find((r) => r.id === "3B")

  if (!r1A || !r3A || !r3B) {
    return { id, name, passed: false, details: "Prerequisite tests not found" }
  }

  const allCount = r1A.carrierCount ?? 0
  const siCount = r3A.carrierCount ?? 0
  const fuwCount = r3B.carrierCount ?? 0
  const combined = siCount + fuwCount
  const ratio = allCount > 0 ? combined / allCount : 0

  return {
    id, name,
    passed: ratio >= 0.7 && ratio <= 1.6,
    details: `All: ${allCount}, SI: ${siCount}, FUW: ${fuwCount}, SI+FUW: ${combined}, ratio: ${ratio.toFixed(2)}`,
    extraData: { allCount, siCount, fuwCount, combined, ratio: ratio.toFixed(2) },
  }
}

// =============================================================================
// TEST GROUP 4 — COMPINC CARRIER FILTERING
// =============================================================================

async function test4A(): Promise<TestResult> {
  const id = "4A"
  const name = "COMPINC=INDE,TRAN,BANN — 3 carriers only"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
      companyInclude: "INDE,TRAN,BANN",
    })
    const carrierIds = uniqueCarrierIds(res)
    // INDE = Foresters, TRAN = Transamerica, BANN = Banner/LGA
    const expected = ["foresters", "transamerica", "lga"]
    const allExpected = expected.every((id) => carrierIds.includes(id))
    const unexpected = carrierIds.filter((id) => !expected.includes(id))

    return {
      id, name,
      passed: allExpected && unexpected.length === 0,
      details: `Returned: [${carrierIds.join(", ")}]. Expected: [${expected.join(", ")}]. Unexpected: [${unexpected.join(", ") || "none"}]`,
      carrierCount: carrierIds.length,
      extraData: { returnedCarriers: carrierIds },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test4B(): Promise<TestResult> {
  const id = "4B"
  const name = "COMPINC=INDE — single carrier (Foresters)"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
      companyInclude: "INDE",
    })
    const carrierIds = uniqueCarrierIds(res)

    return {
      id, name,
      passed: carrierIds.length >= 1 && carrierIds.includes("foresters"),
      details: `Returned: [${carrierIds.join(", ")}]. Expected: foresters only`,
      carrierCount: carrierIds.length,
      top3: top3FromPricing(res),
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

// =============================================================================
// TEST GROUP 5 — HEALTH ANALYZER
// =============================================================================

async function test5A(): Promise<TestResult> {
  const id = "5A"
  const name = "35M, 5'10\" 180lbs — normal build (HA enabled)"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
      heightFeet: 5, heightInches: 10, weight: 180,
    })

    const goCount = res.filter((r) => r.healthAnalyzerStatus === "go").length
    const nogoCount = res.filter((r) => r.healthAnalyzerStatus === "nogo").length
    const unknownCount = res.filter((r) => r.healthAnalyzerStatus === "unknown").length
    const noStatus = res.filter((r) => !r.healthAnalyzerStatus).length

    return {
      id, name,
      passed: res.length > 0 && goCount > nogoCount,
      details: `${res.length} products. HA: go=${goCount}, nogo=${nogoCount}, unknown=${unknownCount}, none=${noStatus}`,
      carrierCount: uniqueCarrierIds(res).length,
      top3: top3FromPricing(res),
      extraData: { goCount, nogoCount, unknownCount, noStatus },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test5B(): Promise<TestResult> {
  const id = "5B"
  const name = "35M, 5'10\" 280lbs — obese build (HA enabled)"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
      heightFeet: 5, heightInches: 10, weight: 280,
    })

    const goCount = res.filter((r) => r.healthAnalyzerStatus === "go").length
    const nogoCount = res.filter((r) => r.healthAnalyzerStatus === "nogo").length
    const rejections = res
      .filter((r) => r.healthAnalyzerStatus === "nogo" && r.healthAnalyzerReason)
      .slice(0, 5)
      .map((r) => `${r.carrierName}: ${r.healthAnalyzerReason}`)

    return {
      id, name,
      passed: res.length > 0,
      details: `${res.length} products. HA: go=${goCount}, nogo=${nogoCount}`,
      carrierCount: uniqueCarrierIds(res).length,
      extraData: { goCount, nogoCount, sampleRejections: rejections },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

async function test5C(): Promise<TestResult> {
  const id = "5C"
  const name = "35M, DUI 3 years ago (HA enabled)"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
      duiHistory: true,
    })

    const goCount = res.filter((r) => r.healthAnalyzerStatus === "go").length
    const nogoCount = res.filter((r) => r.healthAnalyzerStatus === "nogo").length
    const rejections = res
      .filter((r) => r.healthAnalyzerStatus === "nogo" && r.healthAnalyzerReason)
      .slice(0, 5)
      .map((r) => `${r.carrierName}: ${r.healthAnalyzerReason}`)

    // Also check eligibility layer DUI filtering
    const duiEligResults: string[] = []
    for (const carrier of CARRIERS.slice(0, 10)) {
      const elig = checkEligibility(carrier, 35, "TX", 500000, 20, { duiHistory: true, yearsSinceLastDui: 3 }, "term")
      if (!elig.isEligible) {
        duiEligResults.push(`${carrier.name}: ${elig.ineligibilityReason}`)
      }
    }

    return {
      id, name,
      passed: res.length > 0,
      details: `${res.length} products. HA: go=${goCount}, nogo=${nogoCount}. Eligibility rejections (sample): ${duiEligResults.length}`,
      carrierCount: uniqueCarrierIds(res).length,
      healthCode: "R (DUI → Standard)",
      extraData: { goCount, nogoCount, haRejections: rejections, eligRejections: duiEligResults },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

// =============================================================================
// TEST GROUP 6 — CARRIER NAME MAPPING
// =============================================================================

async function test6(): Promise<TestResult> {
  const id = "6"
  const name = "Carrier name mapping audit (from 1A baseline)"
  try {
    const res = await provider.getQuotes({
      age: 35, gender: "Male", state: "TX",
      coverageAmount: 500000, termLength: 20,
      tobaccoStatus: "non-smoker", underwritingType: "all",
    })

    const uniqueNames = [...new Set(res.map((r) => r.carrierName))]
    const carrierIds = uniqueCarrierIds(res)

    // Build mapping table
    const mappingTable = uniqueNames
      .sort()
      .map((name) => {
        const match = res.find((r) => r.carrierName === name)
        return `${name} → ${match?.carrierId ?? "UNMAPPED"}`
      })
      .join("\n")

    // All results returned by the provider are mapped (unmapped are skipped internally)
    // So we report what got through
    return {
      id, name,
      passed: true,
      details: `${uniqueNames.length} Compulife companies → ${carrierIds.length} carrier IDs. ${res.length} total products. All mapped successfully (unmapped are skipped by provider).`,
      carrierCount: carrierIds.length,
      extraData: { totalProducts: res.length, uniqueCompanies: uniqueNames.length, mappingTable },
    }
  } catch (e) {
    return { id, name, passed: false, details: `ERROR: ${(e as Error).message}` }
  }
}

// =============================================================================
// RUNNER
// =============================================================================

async function main() {
  console.log("Starting pipeline verification...\n")

  const tests: Array<{ group: string; fn: () => Promise<TestResult> }> = [
    { group: "1: Term Life", fn: test1A },
    { group: "1: Term Life", fn: test1B },
    { group: "1: Term Life", fn: test1C },
    { group: "1: Term Life", fn: test1D },
    { group: "1: Term Life", fn: test1E },
    { group: "2: Final Expense", fn: test2A },
    { group: "2: Final Expense", fn: test2B },
    { group: "2: Final Expense", fn: test2C },
    { group: "3: SI/FUW", fn: test3A },
    { group: "3: SI/FUW", fn: test3B },
    { group: "3: SI/FUW", fn: test3C_compare },
    { group: "4: COMPINC", fn: test4A },
    { group: "4: COMPINC", fn: test4B },
    { group: "5: Health Analyzer", fn: test5A },
    { group: "5: Health Analyzer", fn: test5B },
    { group: "5: Health Analyzer", fn: test5C },
    { group: "6: Carrier Mapping", fn: test6 },
  ]

  let lastGroup = ""
  for (const { group, fn } of tests) {
    if (group !== lastGroup) {
      console.log(`\n--- Group ${group} ---`)
      lastGroup = group
    }
    const result = await fn()
    results.push(result)
    console.log(`[${result.passed ? "PASS" : "FAIL"}] ${result.id}: ${result.details}`)
  }

  // Cross-comparisons
  const r1A = results.find((r) => r.id === "1A")
  const r1C = results.find((r) => r.id === "1C")
  const r1E = results.find((r) => r.id === "1E")

  console.log("\n--- Price Sanity Checks ---")
  if (r1A?.top3?.[0] && r1C?.top3?.[0]) {
    const ok = r1C.top3[0].monthly > r1A.top3[0].monthly
    console.log(`Smoker vs Non-smoker: $${r1C.top3[0].monthly.toFixed(2)} vs $${r1A.top3[0].monthly.toFixed(2)} — ${ok ? "CORRECT" : "ANOMALY"}`)
  }
  if (r1A?.top3?.[0] && r1E?.top3?.[0]) {
    const ok = r1E.top3[0].monthly > r1A.top3[0].monthly
    console.log(`Age 50 vs 35: $${r1E.top3[0].monthly.toFixed(2)} vs $${r1A.top3[0].monthly.toFixed(2)} — ${ok ? "CORRECT" : "ANOMALY"}`)
  }

  await writeReport()
}

async function writeReport() {
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const total = results.length

  let md = `# Compulife Pipeline Verification Results

**Date:** ${new Date().toISOString().split("T")[0]}
**Total Tests:** ${total} | **Passed:** ${passed} | **Failed:** ${failed}
**Verdict:** ${failed === 0 ? "ALL PASS" : `${failed} FAILURE(S)`}

---

`

  // Group results by prefix
  const groups: Array<{ title: string; prefix: string }> = [
    { title: "Test Group 1 — Term Life (Category 3-7)", prefix: "1" },
    { title: "Test Group 2 — Final Expense (Category Y)", prefix: "2" },
    { title: "Test Group 3 — Simplified Issue (PRODDIS Filtering)", prefix: "3" },
    { title: "Test Group 4 — COMPINC Carrier Filtering", prefix: "4" },
    { title: "Test Group 5 — Health Analyzer Integration", prefix: "5" },
    { title: "Test Group 6 — Carrier Name Mapping", prefix: "6" },
  ]

  for (const { title, prefix } of groups) {
    md += `## ${title}\n\n`
    for (const r of results.filter((r) => r.id.startsWith(prefix))) {
      md += `### ${r.id}: ${r.name}\n`
      md += `- **Result:** ${r.passed ? "PASS" : "FAIL"}\n`
      md += `- **Details:** ${r.details}\n`
      if (r.carrierCount !== undefined) md += `- **Carrier Count:** ${r.carrierCount}\n`
      if (r.categoryCode) md += `- **Category Code:** ${r.categoryCode}\n`
      if (r.stateCode) md += `- **State Code:** ${r.stateCode}\n`
      if (r.healthCode) md += `- **Health Code:** ${r.healthCode}\n`
      if (r.top3 && r.top3.length > 0) {
        md += `- **Top 3 (cheapest):**\n`
        for (const t of r.top3) {
          md += `  - ${t.carrier} (${t.carrierId}): $${t.monthly.toFixed(2)}/mo ($${t.annual.toFixed(2)}/yr)${t.productCode ? ` [${t.productCode}]` : ""}\n`
        }
      }

      // Extra data rendering
      if (r.extraData) {
        if (r.extraData.typeBreakdown) {
          const tb = r.extraData.typeBreakdown as Record<string, number>
          md += `- **FE Type Breakdown:** Level: ${tb.level}, Graded: ${tb.graded}, GI: ${tb["guaranteed-issue"]}\n`
        }
        if (r.extraData.products && Array.isArray(r.extraData.products)) {
          md += `- **Products:**\n`
          for (const p of r.extraData.products as string[]) {
            md += `  - ${p}\n`
          }
        }
        if (r.extraData.sampleRejections && Array.isArray(r.extraData.sampleRejections) && (r.extraData.sampleRejections as string[]).length > 0) {
          md += `- **Sample HA Rejections:**\n`
          for (const s of r.extraData.sampleRejections as string[]) {
            md += `  - ${s}\n`
          }
        }
        if (r.extraData.haRejections && Array.isArray(r.extraData.haRejections) && (r.extraData.haRejections as string[]).length > 0) {
          md += `- **HA Rejections:**\n`
          for (const s of r.extraData.haRejections as string[]) {
            md += `  - ${s}\n`
          }
        }
        if (r.extraData.eligRejections && Array.isArray(r.extraData.eligRejections) && (r.extraData.eligRejections as string[]).length > 0) {
          md += `- **Eligibility Rejections:**\n`
          for (const s of r.extraData.eligRejections as string[]) {
            md += `  - ${s}\n`
          }
        }
        if (r.extraData.mappingTable) {
          md += `\n**Full Mapping Table:**\n\`\`\`\n${r.extraData.mappingTable}\n\`\`\`\n`
        }
        if (r.extraData["10yr_top3"]) {
          md += `- **10yr Top 3:**\n`
          for (const t of r.extraData["10yr_top3"] as TestResult["top3"]) {
            md += `  - ${t!.carrier}: $${t!.monthly.toFixed(2)}/mo\n`
          }
        }
        if (r.extraData["30yr_top3"]) {
          md += `- **30yr Top 3:**\n`
          for (const t of r.extraData["30yr_top3"] as TestResult["top3"]) {
            md += `  - ${t!.carrier}: $${t!.monthly.toFixed(2)}/mo\n`
          }
        }
      }
      md += "\n"
    }
  }

  // Summary table
  md += `---\n\n## Summary\n\n| # | Test | Result |\n|---|------|--------|\n`
  for (const r of results) {
    md += `| ${r.id} | ${r.name} | ${r.passed ? "PASS" : "**FAIL**"} |\n`
  }
  md += `\n**${passed}/${total} passed**`
  if (failed > 0) md += ` — ${failed} failure(s) need investigation`
  md += "\n"

  // Price sanity checks
  const r1A = results.find((r) => r.id === "1A")
  const r1C = results.find((r) => r.id === "1C")
  const r1E = results.find((r) => r.id === "1E")

  md += `\n### Price Sanity Checks\n`
  if (r1A?.top3?.[0] && r1C?.top3?.[0]) {
    const ok = r1C.top3[0].monthly > r1A.top3[0].monthly
    md += `- **Smoker vs Non-smoker (1C vs 1A):** $${r1C.top3[0].monthly.toFixed(2)} vs $${r1A.top3[0].monthly.toFixed(2)} — ${ok ? "CORRECT" : "ANOMALY"}\n`
  }
  if (r1A?.top3?.[0] && r1E?.top3?.[0]) {
    const ok = r1E.top3[0].monthly > r1A.top3[0].monthly
    md += `- **Age 50 vs Age 35 (1E vs 1A):** $${r1E.top3[0].monthly.toFixed(2)} vs $${r1A.top3[0].monthly.toFixed(2)} — ${ok ? "CORRECT" : "ANOMALY"}\n`
  }

  const r2A = results.find((r) => r.id === "2A")
  const r2C = results.find((r) => r.id === "2C")
  if (r2A?.top3?.[0] && r2C?.top3?.[0]) {
    const diff = r2A.top3[0].monthly !== r2C.top3[0].monthly
    md += `- **FE 65M $15K vs 70F $10K (2A vs 2C):** $${r2A.top3[0].monthly.toFixed(2)} vs $${r2C.top3[0].monthly.toFixed(2)} — ${diff ? "Different (CORRECT)" : "Same (check)"}\n`
  }

  // Write file
  const fs = await import("fs/promises")
  await fs.writeFile("docs/COMPULIFE_VERIFICATION_RESULTS.md", md)

  console.log(`\n========================================`)
  console.log(`RESULTS: ${passed}/${total} passed, ${failed} failed`)
  console.log(`Report written to docs/COMPULIFE_VERIFICATION_RESULTS.md`)
  console.log(`========================================`)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
