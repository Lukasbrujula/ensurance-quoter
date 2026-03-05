/**
 * Mapping of internal carrier IDs to Compulife 4-letter company codes.
 * Used to construct logo URLs from the Compulife CDN.
 *
 * Source: https://www.compulifeapi.com/api/CompanyList/ (public, no auth)
 * Logo URL pattern: https://www.compulifeapi.com/images/logosapi/{CODE}-{size}.png
 * Available sizes: small (120x38), medium (240x74), large
 */

export const CARRIER_COMPULIFE_CODES: Record<string, string> = {
  // Fully enriched carriers (14)
  amam: "AMAM", // American-Amicable Life Ins Co of TX
  foresters: "INDE", // Independent Order of Foresters
  moo: "UTOM", // United of Omaha Life Insurance Company
  sbli: "SBLI", // SBLI USA Life Insurance Co Inc
  transamerica: "TRAN", // Transamerica Life Insurance Company
  americo: "AMSV", // Americo Financial Life and Annuity Ins.
  uhl: "UTHO", // United Home Life Insurance Company
  aig: "AMGE", // American General Life Insurance Company
  americanhomelife: "AMHO", // The American Home Life Insurance Company
  baltimore: "BALT", // Baltimore Life Insurance Company
  betterlife: "BETT", // BetterLife
  gtl: "GUAN", // Guarantee Trust Life Insurance Company
  illinoismutual: "ILLI", // Illinois Mutual Life Insurance Company
  // pekin: not in Compulife — falls back to abbreviation badge

  // Basic carriers (24)
  jh: "JOHU", // John Hancock Life Insurance Company USA
  lga: "BANN", // Legal & General America → Banner Life Insurance Company
  nlg: "NATI", // National Life Insurance Company (NLG = National Life Group)
  protective: "PROT", // Protective Life Insurance Company
  // corebridge: not in Compulife — Corebridge Financial (spun off from AIG)
  lincoln: "LNNA", // Lincoln National Life Insurance Company
  prudential: "PRUC", // Pruco Life Insurance Company (Prudential subsidiary)
  nationwide: "NATW", // Nationwide Life and Annuity Insurance Co
  pacific: "PACL", // Pacific Life Insurance Company
  principal: "PRIN", // Principal Life Insurance Company
  northamerican: "NORA", // North American Co for Life and Health
  securian: "SECU", // Securian Life Insurance Company
  // globalatlantic: not in Compulife — different brand from Forethought
  massmutual: "MASM", // Massachusetts Mutual Life Insurance
  newyorklife: "NEWY", // New York Life Insurance Company
  pennmutual: "PENN", // Penn Mutual Life Insurance Company
  symetra: "SYME", // Symetra Life Insurance Company
  brighthouse: "BRIG", // Brighthouse Life Insurance Company
  gerber: "GERB", // Gerber Life Insurance Company
  // colonialpenn: not in Compulife — different brand from Centrian
  // kemper: not in Compulife — different brand from Kentucky Home

  // Generated carriers with Compulife matches
  aaa: "AAAL", // AAA Life Insurance Company
  oneamerica: "AUGU", // OneAmerica → AuguStar Life (subsidiary)
  ameritas: "AMTA", // Ameritas Life Insurance Corp
  assurity: "ASSU", // Assurity Life Insurance Company
  augustar: "AUGU", // AuguStar Life Assurance Corporation
  cincinnati: "CINN", // Cincinnati Life Insurance Company
  columbus: "COLU", // Columbus Life Insurance Company
  equitable: "EQUF", // Equitable Financial Life Insurance Co
  fidelitylife: "FIDL", // Fidelity Life Association
  gbu: "GBUL", // GBU Financial Life
  gleaner: "GLEA", // Gleaner Life Insurance Society
  grange: "GRAN", // Grange Life Insurance Company
  guardian: "GUAR", // Guardian Life Insurance Co of America
  nationalbenefit: "NABE", // National Benefit Life Insurance Company
  ncforesters: "NACA", // National Catholic Society of Foresters
  securitymutual: "SEMU", // Security Mutual Life Insurance Co of NY
  thrivent: "THRI", // Thrivent Financial for Lutherans
  trustedfraternal: "CATH", // Trusted Fraternal Life
  williampenn: "WILP", // William Penn Life Insurance Co of NY
  womanslife: "WOMA", // Woman's Life Insurance Society

  // Generated carriers from carriers-generated.ts
  cvs_accendo: "ACCE", // Accendo Insurance Company (CVS Health subsidiary)
  bankers_fidelity: "BANK", // Bankers Fidelity Life Insurance Company
  cica_life: "CICA", // CICA Life Insurance Company of America
  lafayette: "LAFA", // Lafayette Life Insurance Company
  liberty_bankers: "LIBB", // Liberty Bankers Life Insurance Company
  occidental: "OCCI", // Occidental Life Ins Co of North Carolina
  royal_arcanum: "ROAR", // Royal Arcanum
  royal_neighbors: "ROYA", // Royal Neighbors of America
  sentinel: "SENS", // Sentinel Security Life Insurance Company
  sons_of_norway: "SOFN", // Sons of Norway (Fraternal)
  standard_life: "STAN", // Standard Life and Accident Insurance Co
  trinity: "TRIN", // Trinity Life Insurance Company
}

type LogoSize = "small" | "medium" | "large"

/**
 * Get the Compulife logo URL for a carrier.
 * Returns undefined if the carrier has no Compulife code mapping.
 */
export function getCarrierLogoUrl(
  carrierId: string,
  size: LogoSize = "small"
): string | undefined {
  const code = CARRIER_COMPULIFE_CODES[carrierId]
  if (!code) return undefined
  return `https://www.compulifeapi.com/images/logosapi/${code}-${size}.png`
}
