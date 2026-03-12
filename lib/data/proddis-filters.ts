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
 *
 * Data pre-computed at build time — no runtime JSON import needed.
 * 170 SI product codes across 14 categories, 115 carriers, 1,871 products.
 */

/** SI PRODDIS codes grouped by category letter. Exclude these to keep FUW only. */
const SI_BY_CATEGORY = new Map<string, string[]>([
  ["3", ["3AMTS", "3AMAM", "3CAPI", "3FLEM", "3FLHM", "3FLIM", "3IOSI", "3LIXW", "3NARI", "3OCTS", "3OCET", "3POQI", "3SEVE", "3SEVP", "3UTEP"]],
  ["4", ["4AMTS", "4AMHP", "4ARMT", "4ARTT", "4ARXT", "4BAHT", "4CAPI", "4FLEM", "4FLHM", "4FLIM", "4IOSI", "4LIXW", "4OCTS", "4OCHP", "4POQI", "4SEVE", "4SEVP", "4UTEP"]],
  ["5", ["5AMTS", "5AMAM", "5AMHP", "5ARMT", "5ARTT", "5ARXT", "5BAHT", "5CAPI", "5FLEM", "5FLHM", "5FLIM", "5IOSI", "5LIXW", "5NARI", "5OCTS", "5OCET", "5OCHP", "5POQI", "5SEVE", "5SEVP", "5UFHO", "5UFXO", "5UFRO", "5UTHO", "5UTWO", "5UTXO", "5UTRO", "5UTEP"]],
  ["6", ["6AMHP", "6ARMT", "6ARTT", "6ARXT", "6IOSI", "6OCHP"]],
  ["7", ["7AMTS", "7AMAM", "7AMHP", "7ARMT", "7ARTT", "7ARXT", "7BAHT", "7CAPI", "7FLEM", "7FLHM", "7FLIM", "7IOSI", "7LIXW", "7NARI", "7OCTS", "7OCET", "7OCHP", "7POQI", "7SEVE", "7SEVP", "7UFHO", "7UTHO", "7UTWO", "7UTEP"]],
  ["8", ["8ACCE", "8AMFE", "8AMRO", "8AMBM", "8AGSI", "8AREA", "8AWEA", "8BASG", "8BANK", "8BAPF", "8BESI", "8CAPI", "8CHRI", "8CICA", "8COMB", "8CONT", "8MOTO", "8MOPF", "8FAMI", "8FIDL", "8GOVE", "8IOFX", "8LAFA", "8LIBB", "8MADI", "8NARI", "8OXFO", "8POSI", "8ROAR", "8ROFL", "8ROYA", "8SENA", "8SEPN", "8SENS", "8SILA", "8SIHP", "8SOFN", "8SUSA", "8TIER", "8TREN", "8TRAN", "8TRIN", "8UFSO", "8UFHO", "8UFPO", "8UTHE", "8UNSO", "8UNHO", "8UNPO", "8UTOM"]],
  ["K", ["KBAHT", "KUFHO", "KUTHO"]],
  ["M", ["MBAHT"]],
  ["O", ["OSENS"]],
  ["P", ["PAMEM", "PAMPR", "PBOET", "PBOWT", "PFEDE", "PSENA", "PSEPN", "PTREN", "PUTOM"]],
  ["Q", ["QSENS"]],
  ["R", ["RGOVE", "RSENS"]],
  ["S", ["SBASG", "SGOVE", "SSENS", "STRAN"]],
  ["Y", ["YCAPI", "YCOMB", "YFIDL", "YFISL", "YLIBB", "YTRES", "YUFET", "YUNET"]],
])

/**
 * SI product codes (ProdCode only, no category prefix) grouped by category.
 * Used for post-response filtering when keeping SI only.
 */
const SI_PRODCODES_BY_CATEGORY = new Map<string, Set<string>>([
  ["3", new Set(["AMAM", "AMTS", "CAPI", "FLEM", "FLHM", "FLIM", "IOSI", "LIXW", "NARI", "OCET", "OCTS", "POQI", "SEVE", "SEVP", "UTEP"])],
  ["4", new Set(["AMHP", "AMTS", "ARMT", "ARTT", "ARXT", "BAHT", "CAPI", "FLEM", "FLHM", "FLIM", "IOSI", "LIXW", "OCHP", "OCTS", "POQI", "SEVE", "SEVP", "UTEP"])],
  ["5", new Set(["AMAM", "AMHP", "AMTS", "ARMT", "ARTT", "ARXT", "BAHT", "CAPI", "FLEM", "FLHM", "FLIM", "IOSI", "LIXW", "NARI", "OCET", "OCHP", "OCTS", "POQI", "SEVE", "SEVP", "UFHO", "UFRO", "UFXO", "UTEP", "UTHO", "UTRO", "UTWO", "UTXO"])],
  ["6", new Set(["AMHP", "ARMT", "ARTT", "ARXT", "IOSI", "OCHP"])],
  ["7", new Set(["AMAM", "AMHP", "AMTS", "ARMT", "ARTT", "ARXT", "BAHT", "CAPI", "FLEM", "FLHM", "FLIM", "IOSI", "LIXW", "NARI", "OCET", "OCHP", "OCTS", "POQI", "SEVE", "SEVP", "UFHO", "UTEP", "UTHO", "UTWO"])],
  ["8", new Set(["ACCE", "AGSI", "AMBM", "AMFE", "AMRO", "AREA", "AWEA", "BANK", "BAPF", "BASG", "BESI", "CAPI", "CHRI", "CICA", "COMB", "CONT", "FAMI", "FIDL", "GOVE", "IOFX", "LAFA", "LIBB", "MADI", "MOPF", "MOTO", "NARI", "OXFO", "POSI", "ROAR", "ROFL", "ROYA", "SENA", "SENS", "SEPN", "SIHP", "SILA", "SOFN", "SUSA", "TIER", "TRAN", "TREN", "TRIN", "UFHO", "UFPO", "UFSO", "UNHO", "UNPO", "UNSO", "UTHE", "UTOM"])],
  ["K", new Set(["BAHT", "UFHO", "UTHO"])],
  ["M", new Set(["BAHT"])],
  ["O", new Set(["SENS"])],
  ["P", new Set(["AMEM", "AMPR", "BOET", "BOWT", "FEDE", "SENA", "SEPN", "TREN", "UTOM"])],
  ["Q", new Set(["SENS"])],
  ["R", new Set(["GOVE", "SENS"])],
  ["S", new Set(["BASG", "GOVE", "SENS", "TRAN"])],
  ["Y", new Set(["CAPI", "COMB", "FIDL", "FISL", "LIBB", "TRES", "UFET", "UNET"])],
])

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
