/**
 * Tests how weight/BMI affects Health Analyzer eligibility across carriers.
 * Three queries with identical params except weight: 160, 220, 280 lbs.
 *
 * Usage: bun run scripts/test-build-chart.ts
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

interface Result {
  company: string
  product: string
  prodCode: string
  annual: string
  healthCat: string
  haStatus: string
  haReason: string
}

async function runQuery(weight: string, bmi: string, ip: string): Promise<Result[]> {
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
    MaxNumResults: "10",
    DoHeightWeight: "ON",
    Feet: "5",
    Inches: "10",
    Weight: weight,
    DoSmokingTobacco: "ON",
    DoCigarettes: "OFF",
    SortByHealth: "ON",
    RejectReasonBr: "ON",
  }

  const json = JSON.stringify(params)
  const url = `https://www.compulifeapi.com/api/request/?COMPULIFE=${encodeURIComponent(json)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = await res.json()

  const categories = Array.isArray(data.Compulife_ComparisonResults)
    ? data.Compulife_ComparisonResults
    : [data.Compulife_ComparisonResults]

  const results: Result[] = []
  for (const cat of categories) {
    if (!cat.Compulife_Results) continue
    for (const r of cat.Compulife_Results) {
      const rawStatus = (r.HealthAnalysisResult || "").trim().toLowerCase()
      let status = rawStatus
      if (rawStatus === "go") status = "go"
      else if (rawStatus === "nogo" || rawStatus === "no") status = "no"
      else if (rawStatus === "dk" || rawStatus === "?") status = "dk"

      const reason = r.HealthRejReason
        ? r.HealthRejReason.replace(/<BR\s*\/?>/gi, " | ").replace(/<[^>]+>/g, "").trim()
        : ""

      results.push({
        company: (r.Compulife_company || "").trim(),
        product: (r.Compulife_product || "").trim(),
        prodCode: (r.Compulife_compprodcode || "").trim(),
        annual: (r.Compulife_premiumAnnual || "").trim(),
        healthCat: (r.Compulife_healthcat || "").trim(),
        haStatus: status,
        haReason: reason,
      })
    }
  }

  return results
}

async function main() {
  const ip = await getPublicIP()

  const queries = [
    { weight: "160", bmi: "23.0", label: "A — 160 lbs (BMI ~23, healthy)" },
    { weight: "220", bmi: "31.6", label: "B — 220 lbs (BMI ~32, overweight)" },
    { weight: "280", bmi: "40.2", label: "C — 280 lbs (BMI ~40, obese)" },
  ]

  const allResults: { label: string; weight: string; bmi: string; results: Result[] }[] = []

  for (const q of queries) {
    console.log(`Fetching: ${q.label}...`)
    const results = await runQuery(q.weight, q.bmi, ip)
    allResults.push({ ...q, results })
  }

  // Print each query
  for (const q of allResults) {
    const goCount = q.results.filter((r) => r.haStatus === "go").length
    const dkCount = q.results.filter((r) => r.haStatus === "dk").length
    const noCount = q.results.filter((r) => r.haStatus === "no").length

    console.log(`\n${"=".repeat(90)}`)
    console.log(`QUERY ${q.label}`)
    console.log(`${"=".repeat(90)}`)
    console.log(`Results: ${q.results.length} total — ${goCount} go, ${dkCount} dk, ${noCount} no`)
    console.log(`${"-".repeat(90)}`)

    for (let i = 0; i < q.results.length; i++) {
      const r = q.results[i]
      const statusIcon = r.haStatus === "go" ? "GO  " : r.haStatus === "dk" ? "DK  " : "NO  "
      console.log(`${String(i + 1).padStart(2)}. [${statusIcon}] ${r.company}`)
      console.log(`          ${r.product}`)
      console.log(`          $${r.annual}/yr | ${r.healthCat}`)
      if (r.haStatus === "no" && r.haReason) {
        console.log(`          REASON: ${r.haReason}`)
      }
      if (r.haStatus === "dk" && r.haReason) {
        console.log(`          NOTE: ${r.haReason}`)
      }
    }
  }

  // Comparison summary
  console.log(`\n${"=".repeat(90)}`)
  console.log("COMPARISON SUMMARY")
  console.log(`${"=".repeat(90)}`)
  console.log("")
  console.log("Weight  | BMI  | GO | DK | NO | Cheapest GO         | Price")
  console.log("--------|------|----|----|----|--------------------|-------")
  for (const q of allResults) {
    const goCount = q.results.filter((r) => r.haStatus === "go").length
    const dkCount = q.results.filter((r) => r.haStatus === "dk").length
    const noCount = q.results.filter((r) => r.haStatus === "no").length
    const cheapestGo = q.results.find((r) => r.haStatus === "go")
    const cheapestName = cheapestGo ? cheapestGo.company.slice(0, 20) : "—"
    const cheapestPrice = cheapestGo ? `$${cheapestGo.annual}` : "—"
    console.log(
      `${q.weight.padEnd(8)}| ${q.bmi.padEnd(5)}| ${String(goCount).padEnd(3)}| ${String(dkCount).padEnd(3)}| ${String(noCount).padEnd(3)}| ${cheapestName.padEnd(19)}| ${cheapestPrice}`,
    )
  }

  // Unique rejection reasons across all queries
  console.log("\nUNIQUE REJECTION REASONS:")
  const reasons = new Set<string>()
  for (const q of allResults) {
    for (const r of q.results) {
      if (r.haStatus === "no" && r.haReason) {
        reasons.add(`[${q.weight} lbs] ${r.company}: ${r.haReason}`)
      }
    }
  }
  for (const reason of reasons) {
    console.log(`  ${reason}`)
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
