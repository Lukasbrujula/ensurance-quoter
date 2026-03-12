/**
 * Tests Health Analyzer with a high-risk profile to trigger "nogo" results
 * and see rejection reasons.
 *
 * Profile: 5'10" 310lbs (BMI ~44.5), smoker, DUI, high blood pressure
 *
 * Usage: bun run scripts/test-health-analyzer-nogo.ts
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
    Smoker: "Y",
    Health: "R",
    NewCategory: "5",
    FaceAmount: "500000",
    State: "44",
    ModeUsed: "ALL",
    SortOverride1: "A",
    MaxNumResults: "10",
    // Health Analyzer: obese smoker with high BP and DUI
    DoHeightWeight: "ON",
    Feet: "5",
    Inches: "10",
    Weight: "310",
    DoSmokingTobacco: "ON",
    DoCigarettes: "ON",
    PeriodCigarettes: "3",   // years smoking
    NumCigarettes: "10",     // per day
    DoBloodPressure: "ON",
    Systolic: "165",
    Dystolic: "100",
    BloodPressureMedication: "Y",
    PeriodBloodPressure: "5", // years on medication
    DoDriving: "ON",
    HadDriversLicense: "Y",
    DwiConviction: "Y",
    PeriodDwiConviction: "2",
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

  console.log("HIGH-RISK PROFILE: 5'10\" 310lbs, smoker (cigarettes), BP 165/100 on meds, DUI 2yrs ago")
  console.log("\nFetching...")

  const json = JSON.stringify(params)
  const url = `https://www.compulifeapi.com/api/request/?COMPULIFE=${encodeURIComponent(json)}`
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
  let nogoCount = 0
  let dkCount = 0
  let noFieldCount = 0

  console.log("\n=== RESULTS ===\n")

  let num = 0
  for (const cat of categories) {
    if (!cat.Compulife_Results) continue
    for (const r of cat.Compulife_Results) {
      num++
      const name = (r.Compulife_product || "").trim()
      const company = (r.Compulife_company || "").trim()
      const annual = (r.Compulife_premiumAnnual || "").trim()
      const healthCat = (r.Compulife_healthcat || "").trim()
      const haResult = r.HealthAnalysisResult
      const haReason = r.HealthRejReason

      let status = "N/A"
      if (haResult === "go") { status = "GO"; goCount++ }
      else if (haResult === "nogo") { status = "NOGO"; nogoCount++ }
      else if (haResult === "dk") { status = "DK (don't know)"; dkCount++ }
      else { status = `MISSING (raw: ${haResult})`; noFieldCount++ }

      console.log(`${num}. ${company} — ${name}`)
      console.log(`   Annual: $${annual} | Class: ${healthCat}`)
      console.log(`   HealthAnalysisResult: ${status}`)
      if (haReason) {
        // Clean HTML tags for readability
        const cleanReason = haReason.replace(/<BR\s*\/?>/gi, " | ").replace(/<[^>]+>/g, "").trim()
        console.log(`   HealthRejReason: ${cleanReason}`)
      }
      console.log()
    }
  }

  console.log("=== SUMMARY ===")
  console.log(`Total results: ${num}`)
  console.log(`GO: ${goCount} | NOGO: ${nogoCount} | DK: ${dkCount} | Missing: ${noFieldCount}`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
