/**
 * Runs two Compulife quotes for the same person (Foresters only, 20yr term):
 *   A) No PRODDIS filter — all products
 *   B) PRODDIS=5IOSI — excludes SI product
 *
 * Usage: bun run scripts/compare-proddis.ts
 */

const AUTH_ID = process.env.COMPULIFE_AUTH_ID
if (!AUTH_ID) {
  console.error("COMPULIFE_AUTH_ID not set")
  process.exit(1)
}

const baseParams = {
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
  COMPINC: "INDE",
}

async function getPublicIP(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=text", {
    signal: AbortSignal.timeout(5_000),
  })
  return (await res.text()).trim()
}

async function runQuery(
  label: string,
  extraParams: Record<string, string> = {},
): Promise<void> {
  const ip = await getPublicIP()

  const params = {
    COMPULIFEAUTHORIZATIONID: AUTH_ID!,
    REMOTE_IP: ip,
    ...baseParams,
    ...extraParams,
  }

  const json = JSON.stringify(params)
  const url = `https://www.compulifeapi.com/api/request/?COMPULIFE=${encodeURIComponent(json)}`

  console.log(`\n${"=".repeat(80)}`)
  console.log(`QUERY ${label}`)
  console.log(`${"=".repeat(80)}`)
  console.log(`Extra params: ${JSON.stringify(extraParams) || "(none)"}`)
  console.log(`Full request JSON: ${json}`)
  console.log()

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`)
    return
  }

  const data = await res.json()

  // Pretty-print full response
  console.log("FULL RESPONSE:")
  console.log(JSON.stringify(data, null, 2))

  // Summary table
  const categories = Array.isArray(data.Compulife_ComparisonResults)
    ? data.Compulife_ComparisonResults
    : [data.Compulife_ComparisonResults]

  console.log(`\nPRODUCT SUMMARY (${label}):`)
  console.log("-".repeat(100))
  console.log(
    "Product Name".padEnd(45) +
      "ProdCode".padEnd(10) +
      "Annual".padEnd(12) +
      "Monthly".padEnd(12) +
      "Health".padEnd(8) +
      "Guar",
  )
  console.log("-".repeat(100))

  let count = 0
  for (const cat of categories) {
    if (!cat.Compulife_Results) continue
    for (const r of cat.Compulife_Results) {
      count++
      const name = (r.Compulife_product || "").trim().padEnd(45)
      const code = (r.Compulife_compprodcode || "").trim().padEnd(10)
      const annual = (r.Compulife_premiumAnnual || "").trim().padEnd(12)
      const monthly = (r.Compulife_premiumM || "").trim().padEnd(12)
      const health = (r.Compulife_healthcat || "").trim().padEnd(8)
      const guar = (r.Compulife_guar || "").trim()
      console.log(`${name}${code}${annual}${monthly}${health}${guar}`)
    }
  }
  console.log(`\nTotal products: ${count}`)
}

async function main() {
  console.log("Running Compulife PRODDIS comparison...\n")
  console.log("Base params:", JSON.stringify(baseParams, null, 2))

  await runQuery("A — No PRODDIS (all Foresters 20yr products)")
  await runQuery("B — PRODDIS=5IOSI (exclude SI product)", {
    PRODDIS: "5IOSI",
  })
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
