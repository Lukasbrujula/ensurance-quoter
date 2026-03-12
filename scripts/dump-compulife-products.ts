/**
 * Fetches the full CompanyProductList from the Compulife API,
 * saves raw JSON to docs/compulife-products-dump.json,
 * then analyzes product names.
 *
 * Usage: bun run scripts/dump-compulife-products.ts
 */

import { writeFileSync } from "fs"
import { resolve } from "path"

const AUTH_ID = process.env.COMPULIFE_AUTH_ID
if (!AUTH_ID) {
  console.error("COMPULIFE_AUTH_ID not set. Add it to .env.local or export it.")
  process.exit(1)
}

async function main() {
  console.log("Fetching CompanyProductList from Compulife API...")

  const url = `https://compulifeapi.com/api/CompanyProductList/?COMPULIFEAUTHORIZATIONID=${AUTH_ID}`
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })

  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`)
    const body = await res.text()
    console.error(body.slice(0, 500))
    process.exit(1)
  }

  const data = await res.json()

  // Save raw JSON
  const outPath = resolve(__dirname, "../docs/compulife-products-dump.json")
  writeFileSync(outPath, JSON.stringify(data, null, 2))
  console.log(`Saved raw JSON to ${outPath}`)

  // --- Analysis ---

  interface Product {
    CategoryLetter: string
    ProdCode: string
    Name: string
  }

  interface Company {
    Name: string
    CompCode: string
    Products: Product[]
  }

  const companies = data as Company[]
  const allProducts: { company: string; compCode: string; product: Product }[] = []

  for (const co of companies) {
    for (const p of co.Products) {
      allProducts.push({ company: co.Name, compCode: co.CompCode, product: p })
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Total companies: ${companies.length}`)
  console.log(`Total products: ${allProducts.length}`)

  // SI-type patterns
  const siPatterns = /\b(simplified|si\b|express|rapid)/i
  const siProducts = allProducts.filter((p) => siPatterns.test(p.product.Name))
  console.log(`\nProducts matching "Simplified/SI/Express/Rapid": ${siProducts.length}`)

  // Plus/Select/Ultra patterns
  const plusPatterns = /\b(plus|select|ultra)\b/i
  const plusProducts = allProducts.filter((p) => plusPatterns.test(p.product.Name))
  console.log(`Products matching "Plus/Select/Ultra": ${plusProducts.length}`)

  // --- Carriers with both SI-type and FUW-type products in the same category ---
  // Build a map: carrier -> category -> { hasSI, hasFUW }
  const carrierCategoryMap = new Map<
    string,
    Map<string, { siNames: string[]; fuwNames: string[] }>
  >()

  for (const entry of allProducts) {
    const key = `${entry.company.trim()}`
    const cat = entry.product.CategoryLetter
    const name = entry.product.Name.trim()
    const isSI = siPatterns.test(name)

    if (!carrierCategoryMap.has(key)) {
      carrierCategoryMap.set(key, new Map())
    }
    const catMap = carrierCategoryMap.get(key)!
    if (!catMap.has(cat)) {
      catMap.set(cat, { siNames: [], fuwNames: [] })
    }
    const bucket = catMap.get(cat)!
    if (isSI) {
      bucket.siNames.push(name)
    } else {
      bucket.fuwNames.push(name)
    }
  }

  console.log(`\n=== CARRIERS WITH BOTH SI-TYPE AND FUW-TYPE PRODUCTS IN SAME CATEGORY ===\n`)

  const bothCarriers: {
    carrier: string
    category: string
    siProducts: string[]
    fuwProducts: string[]
  }[] = []

  for (const [carrier, catMap] of carrierCategoryMap) {
    for (const [cat, bucket] of catMap) {
      if (bucket.siNames.length > 0 && bucket.fuwNames.length > 0) {
        bothCarriers.push({
          carrier: carrier.trim(),
          category: cat,
          siProducts: bucket.siNames,
          fuwProducts: bucket.fuwNames,
        })
      }
    }
  }

  if (bothCarriers.length === 0) {
    console.log("None found.")
  } else {
    // Group by carrier
    const grouped = new Map<string, typeof bothCarriers>()
    for (const entry of bothCarriers) {
      if (!grouped.has(entry.carrier)) {
        grouped.set(entry.carrier, [])
      }
      grouped.get(entry.carrier)!.push(entry)
    }

    for (const [carrier, entries] of grouped) {
      console.log(`${carrier}`)
      for (const e of entries) {
        console.log(`  Category ${e.category}:`)
        console.log(`    SI-type: ${e.siProducts.join(", ")}`)
        console.log(`    FUW-type: ${e.fuwProducts.join(", ")}`)
      }
      console.log()
    }
    console.log(`Total: ${grouped.size} carrier(s) across ${bothCarriers.length} category overlap(s)`)
  }

  // --- Breakdown of SI-type products by keyword ---
  console.log(`\n=== SI-TYPE PRODUCT BREAKDOWN ===\n`)

  const simplified = allProducts.filter((p) => /\bsimplified\b/i.test(p.product.Name))
  const siAbbrev = allProducts.filter((p) => /\bsi\b/i.test(p.product.Name))
  const express = allProducts.filter((p) => /\bexpress\b/i.test(p.product.Name))
  const rapid = allProducts.filter((p) => /\brapid\b/i.test(p.product.Name))

  console.log(`"Simplified": ${simplified.length}`)
  console.log(`"SI" (abbreviation): ${siAbbrev.length}`)
  console.log(`"Express": ${express.length}`)
  console.log(`"Rapid": ${rapid.length}`)

  // List all SI-type product names for reference
  console.log(`\n=== ALL SI-TYPE PRODUCT NAMES ===\n`)
  const seen = new Set<string>()
  for (const p of siProducts) {
    const name = p.product.Name.trim()
    if (!seen.has(name)) {
      seen.add(name)
      console.log(`  [${p.product.CategoryLetter}] ${p.company.trim()} — ${name}`)
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
