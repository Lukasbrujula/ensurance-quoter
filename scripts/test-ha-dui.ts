/**
 * Tests Health Analyzer DUI handling.
 * DWI conviction within 3 years, otherwise clean profile.
 *
 * Usage: bun run scripts/test-ha-dui.ts
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
    MaxNumResults: "20",
    // DUI fields
    DoDriving: "ON",
    HadDriversLicense: "Y",
    DwiConviction: "Y",
    PeriodDwiConviction: "3",
    RecklessConviction: "N",
    SuspendedConviction: "N",
    MoreThanOneAccident: "N",
    MovingViolations0: "0",
    MovingViolations1: "0",
    MovingViolations2: "0",
    MovingViolations3: "0",
    MovingViolations4: "0",
    SortByHealth: "ON",
    RejectReasonBr: "ON",
  }

  console.log("DUI TEST: DWI conviction within 3 years, otherwise clean PP profile")
  console.log("Params: State 44 (TX), Male, Non-smoker, PP, age 37, $500K, 20yr term\n")

  const json = JSON.stringify(params)
  const url = `https://www.compulifeapi.com/api/request/?COMPULIFE=${encodeURIComponent(json)}`

  console.log("Fetching...")
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  const data = await res.json()

  const categories = Array.isArray(data.Compulife_ComparisonResults)
    ? data.Compulife_ComparisonResults
    : [data.Compulife_ComparisonResults]

  let goCount = 0
  let dkCount = 0
  let noCount = 0
  let num = 0

  console.log(`\n${"=".repeat(100)}`)
  console.log("ALL RESULTS")
  console.log(`${"=".repeat(100)}\n`)

  for (const cat of categories) {
    if (!cat.Compulife_Results) continue
    for (const r of cat.Compulife_Results) {
      num++
      const company = (r.Compulife_company || "").trim()
      const product = (r.Compulife_product || "").trim()
      const annual = (r.Compulife_premiumAnnual || "").trim()
      const healthCat = (r.Compulife_healthcat || "").trim()
      const prodCode = (r.Compulife_compprodcode || "").trim()
      const rawStatus = (r.HealthAnalysisResult || "").trim().toLowerCase()
      const rawReason = r.HealthRejReason || ""
      const cleanReason = rawReason
        .replace(/<BR\s*\/?>/gi, " | ")
        .replace(/<[^>]+>/g, "")
        .replace(/\|\s*$/, "")
        .trim()

      let status: string
      if (rawStatus === "go") { status = "GO"; goCount++ }
      else if (rawStatus === "no" || rawStatus === "nogo") { status = "NO"; noCount++ }
      else if (rawStatus === "dk" || rawStatus === "?") { status = "DK"; dkCount++ }
      else { status = `?(${rawStatus})`; dkCount++ }

      const pad = String(num).padStart(2)
      console.log(`${pad}. [${status.padEnd(2)}] ${company}`)
      console.log(`         ${product} (${prodCode})`)
      console.log(`         $${annual}/yr | ${healthCat}`)
      if (cleanReason) {
        console.log(`         REASON: ${cleanReason}`)
      }
      console.log()
    }
  }

  console.log(`${"=".repeat(100)}`)
  console.log(`SUMMARY: ${num} results — ${goCount} GO, ${dkCount} DK, ${noCount} NO`)
  console.log(`${"=".repeat(100)}`)

  // Group rejection reasons
  const reasonMap = new Map<string, string[]>()
  num = 0
  for (const cat of categories) {
    if (!cat.Compulife_Results) continue
    for (const r of cat.Compulife_Results) {
      num++
      const rawStatus = (r.HealthAnalysisResult || "").trim().toLowerCase()
      if (rawStatus === "no" || rawStatus === "nogo") {
        const reason = (r.HealthRejReason || "")
          .replace(/<BR\s*\/?>/gi, " | ")
          .replace(/<[^>]+>/g, "")
          .replace(/\|\s*$/, "")
          .trim()
        const company = (r.Compulife_company || "").trim()
        if (!reasonMap.has(reason)) reasonMap.set(reason, [])
        reasonMap.get(reason)!.push(company)
      }
    }
  }

  if (reasonMap.size > 0) {
    console.log("\nREJECTION REASONS GROUPED:")
    for (const [reason, carriers] of reasonMap) {
      const unique = [...new Set(carriers)]
      console.log(`\n  "${reason}"`)
      console.log(`  Carriers (${unique.length}): ${unique.join(", ")}`)
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
