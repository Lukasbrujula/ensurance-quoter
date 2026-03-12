/**
 * Pre-computed PRODDIS exclusion codes for Simplified Issue (SI) vs
 * Fully Underwritten (FUW) product filtering.
 *
 * Generated from docs/compulife-products-dump.json.
 * SI products are identified by name pattern: /\bSI\b|^SI\s*-|simplified|express|rapid/i
 *
 * Two strategies (Compulife has a PRODDIS length limit):
 *
 * 1. **FUW filter** (keep FUW, exclude SI): Use PRODDIS to exclude the small
 *    SI product set (~28 codes per category). This fits within Compulife limits.
 *
 * 2. **SI filter** (keep SI, exclude FUW): The FUW product set is too large
 *    (~225 codes) for PRODDIS. Instead, fetch all results and filter
 *    post-response using the SI product code allowlist.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawData = require("../../docs/compulife-products-dump.json")

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

const SI_PATTERN = /\bSI\b|^SI\s*-|simplified|express|rapid/i

function classifyProduct(name: string): "si" | "fuw" {
  return SI_PATTERN.test(name.trim()) ? "si" : "fuw"
}

/** SI PRODDIS codes grouped by category letter. Exclude these to keep FUW only. */
const SI_BY_CATEGORY = new Map<string, string[]>()

/**
 * SI product codes (ProdCode only, no category prefix) grouped by category.
 * Used for post-response filtering when keeping SI only.
 */
const SI_PRODCODES_BY_CATEGORY = new Map<string, Set<string>>()

// Build lookup maps at module load
for (const co of rawData as Company[]) {
  for (const p of co.Products) {
    const cat = p.CategoryLetter
    const type = classifyProduct(p.Name)

    if (type === "si") {
      // PRODDIS exclusion code (for FUW filter)
      const proddisCode = `${cat}${p.ProdCode}`
      const existing = SI_BY_CATEGORY.get(cat)
      if (existing) {
        if (!existing.includes(proddisCode)) existing.push(proddisCode)
      } else {
        SI_BY_CATEGORY.set(cat, [proddisCode])
      }

      // Raw ProdCode set (for post-response SI filter)
      const codeSet = SI_PRODCODES_BY_CATEGORY.get(cat)
      if (codeSet) {
        codeSet.add(p.ProdCode)
      } else {
        SI_PRODCODES_BY_CATEGORY.set(cat, new Set([p.ProdCode]))
      }
    }
  }
}

/**
 * Returns the PRODDIS exclusion string for the FUW filter (keep FUW, exclude SI).
 *
 * For SI filtering, use `isSIProduct()` to filter results post-response instead,
 * because the FUW exclusion set is too large for Compulife's PRODDIS limit.
 *
 * @param category - Compulife NewCategory code (e.g., "5" for 20yr term)
 * @returns Comma-separated PRODDIS string, or undefined if no SI codes to exclude
 */
export function getProddisExclusionForFUW(
  category: string,
): string | undefined {
  const codes = SI_BY_CATEGORY.get(category)
  if (!codes || codes.length === 0) return undefined
  return codes.join(",")
}

/**
 * Checks if a product code belongs to a Simplified Issue product.
 * Used for post-response filtering when the user selects "SI only".
 *
 * @param category - Compulife NewCategory code
 * @param prodCode - Product code from Compulife response (e.g., "IOSI")
 */
export function isSIProduct(category: string, prodCode: string): boolean {
  const codeSet = SI_PRODCODES_BY_CATEGORY.get(category)
  if (!codeSet) return false
  return codeSet.has(prodCode)
}
