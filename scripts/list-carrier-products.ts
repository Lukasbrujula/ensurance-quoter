/**
 * Lists all products for 5 target carriers, grouped by category,
 * marked SI or FUW, with PRODDIS codes.
 *
 * Usage: bun run scripts/list-carrier-products.ts
 */

import data from "../docs/compulife-products-dump.json"

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

const targetCodes = ["INDE", "SBLI", "LISW", "FIDL", "UTOM"]
const carriers = (data as Company[]).filter((c) =>
  targetCodes.includes(c.CompCode)
)

const siPattern = /\bSI\b|^SI\s*-|simplified|express|rapid/i

const catLabels: Record<string, string> = {
  "1": "1yr Term",
  "3": "10yr Term",
  "4": "15yr Term",
  "5": "20yr Term",
  "6": "25yr Term",
  "7": "30yr Term",
  "9": "35yr Term",
  "0": "40yr Term",
  F: "Other Term",
  "8": "No-Lapse UL",
  Y: "Final Expense",
  A: "To Age 80",
  B: "To Age 85",
  C: "To Age 90",
  D: "To Age 95",
  E: "To Age 100",
  G: "To Age 105",
  H: "To Age 110",
  T: "To Age 65",
  U: "To Age 70",
  V: "To Age 75",
  J: "15yr ROP",
  K: "20yr ROP",
  L: "25yr ROP",
  M: "30yr ROP",
  W: "ROP to 65",
  O: "UL Single Pay",
  P: "UL Pay-to-100",
  Q: "UL Pay-to-65",
  R: "UL 20-Pay",
  S: "UL 10-Pay",
}

const catOrder = [
  "1",
  "3",
  "4",
  "5",
  "6",
  "7",
  "9",
  "0",
  "F",
  "J",
  "K",
  "L",
  "M",
  "W",
  "8",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "A",
  "B",
  "C",
  "D",
  "E",
  "G",
  "H",
  "T",
  "U",
  "V",
  "Y",
]

// Sort carriers in requested order
const orderedCodes = ["INDE", "SBLI", "UTOM", "LISW", "FIDL"]
carriers.sort(
  (a, b) =>
    orderedCodes.indexOf(a.CompCode) - orderedCodes.indexOf(b.CompCode)
)

for (const co of carriers) {
  console.log("=" .repeat(80))
  console.log(`${co.Name} (${co.CompCode})`)
  console.log("=".repeat(80))

  // Group by category
  const byCat = new Map<string, Product[]>()
  for (const p of co.Products) {
    const cat = p.CategoryLetter
    if (!byCat.has(cat)) byCat.set(cat, [])
    byCat.get(cat)!.push(p)
  }

  const sortedCats = [...byCat.keys()].sort((a, b) => {
    const ai = catOrder.indexOf(a)
    const bi = catOrder.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  let siCount = 0
  let fuwCount = 0
  const siProddis: string[] = []
  const fuwProddis: string[] = []

  for (const cat of sortedCats) {
    const products = byCat.get(cat)!
    const label = catLabels[cat] || cat
    console.log("")
    console.log(`  Category ${cat} (${label})`)
    console.log(`  ${"-".repeat(74)}`)

    for (const p of products) {
      const name = p.Name.trim()
      const isSI = siPattern.test(name)
      const type = isSI ? "SI " : "FUW"
      const proddis = `${cat}${p.ProdCode}`

      if (isSI) {
        siCount++
        siProddis.push(proddis)
      } else {
        fuwCount++
        fuwProddis.push(proddis)
      }

      console.log(`    ${type}  ${name}`)
      console.log(`         ProdCode: ${p.ProdCode}  |  PRODDIS: ${proddis}`)
    }
  }

  console.log("")
  console.log(`  TOTALS: ${siCount} SI products, ${fuwCount} FUW products`)
  console.log("")
  console.log(`  PRODDIS to EXCLUDE SI products (keep FUW only):`)
  console.log(`    ${siProddis.join(",")}`)
  console.log("")
  console.log(`  PRODDIS to EXCLUDE FUW products (keep SI only):`)
  console.log(`    ${fuwProddis.join(",")}`)
  console.log("")
}
