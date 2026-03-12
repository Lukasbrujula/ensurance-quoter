/**
 * Tests whether Health Analyzer fields are returned in Compulife quote responses.
 *
 * Usage: bun run scripts/test-health-analyzer.ts
 */

const AUTH_ID = process.env.COMPULIFE_AUTH_ID
if (!AUTH_ID) {
  console.error("COMPULIFE_AUTH_ID not set")
  process.exit(1)
}

async function getPublicIP(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=text", {
    signal: AbortSignal.timeout(5_000),
  })
  return (await res.text()).trim()
}

async function main() {
  const ip = await getPublicIP()

  const params = {
    COMPULIFEAUTHORIZATIONID: AUTH_ID!,
    REMOTE_IP: ip,
    BirthDay: "15",
    BirthMonth: "6",
    BirthYear: "1989",
    Sex: "M",
    Smoker: "N",
    Health: "PP",
    NewCategory: "5",
    FaceAmount: "500000",
    State: "44",
    ModeUsed: "ALL",
    SortOverride1: "A",
    MaxNumResults: "5",
    // Health Analyzer fields
    DoHeightWeight: "ON",
    Feet: "5",
    Inches: "10",
    Weight: "180",
    DoSmokingTobacco: "ON",
    DoCigarettes: "OFF",
    SortByHealth: "ON",
    RejectReasonBr: "ON",
  }

  console.log("Request params:")
  console.log(JSON.stringify(params, null, 2))

  const json = JSON.stringify(params)
  const url = `https://www.compulifeapi.com/api/request/?COMPULIFE=${encodeURIComponent(json)}`

  console.log("\nFetching...")
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  const data = await res.json()

  // Print Lookup section for context
  console.log("\n=== LOOKUP (parsed input) ===")
  console.log(JSON.stringify(data.Lookup, null, 2))

  // Get results
  const categories = Array.isArray(data.Compulife_ComparisonResults)
    ? data.Compulife_ComparisonResults
    : [data.Compulife_ComparisonResults]

  let resultNum = 0
  for (const cat of categories) {
    console.log(`\n=== Category: ${cat.Compulife_title} ===`)

    if (!cat.Compulife_Results) {
      console.log("(no results)")
      continue
    }

    for (const r of cat.Compulife_Results) {
      resultNum++
      console.log(`\n--- Result ${resultNum} ---`)

      // Print ALL fields on this result object
      const keys = Object.keys(r).sort()
      for (const key of keys) {
        const val = r[key]
        const trimmed = typeof val === "string" ? val.trim() : val
        console.log(`  ${key}: ${JSON.stringify(trimmed)}`)
      }

      // Highlight Health Analyzer fields specifically
      const haResult = r.HealthAnalysisResult
      const haReason = r.HealthRejReason
      console.log("")
      console.log(
        `  >>> HealthAnalysisResult: ${haResult !== undefined ? JSON.stringify(haResult) : "NOT PRESENT"}`,
      )
      console.log(
        `  >>> HealthRejReason: ${haReason !== undefined ? JSON.stringify(haReason) : "NOT PRESENT"}`,
      )
    }
  }

  console.log(`\n=== TOTAL RESULTS: ${resultNum} ===`)

  // Also print the raw full response for reference
  console.log("\n=== FULL RAW JSON ===")
  console.log(JSON.stringify(data, null, 2))
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
