import { NextResponse } from "next/server"
import { z } from "zod"
import { CARRIERS } from "@/lib/data/carriers"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  checkEligibility,
  checkStructuredMedicalEligibility,
  checkPrescriptionScreening,
  checkCombinationDeclines,
} from "@/lib/engine/eligibility"
import { checkBuildChart } from "@/lib/engine/build-chart"
import { pricingProvider } from "@/lib/engine/pricing-config"
import type { PricingResult } from "@/lib/engine/pricing"
import {
  calculateMatchScore,
  rankByPrice,
} from "@/lib/engine/match-scoring"
import { getMedicationWarnings } from "@/lib/engine/medication-screening"
import { classifyTobaccoForCarrier } from "@/lib/engine/tobacco-classification"
import type {
  CarrierQuote,
  NicotineType,
  QuoteResponse,
  RateClassPrice,
  Gender,
  TobaccoStatus,
  TermLength,
  UnderwritingWarning,
} from "@/lib/types"
import { mapHealthClass, getRopCategory, getTermToAgeCategory, getRopToAgeCategory } from "@/lib/engine/compulife-provider"

const quoteRequestSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(18).max(85),
  gender: z.enum(["Male", "Female"]),
  state: z.string().min(1),
  coverageAmount: z.number().min(5000).max(10000000),
  termLength: z.union([
    z.literal(10),
    z.literal(15),
    z.literal(20),
    z.literal(25),
    z.literal(30),
    z.literal(35),
    z.literal(40),
  ]),
  tobaccoStatus: z.enum(["non-smoker", "smoker"]),
  nicotineType: z.enum(["none", "cigarettes", "vaping", "cigars", "smokeless", "pouches", "marijuana", "nrt"]).optional(),
  healthIndicators: z
    .object({
      bloodPressure: z.string().optional(),
      ldl: z.number().optional(),
      bmi: z.number().optional(),
      preExistingConditions: z.array(z.string()).optional(),
    })
    .optional(),
  heightFeet: z.number().int().min(3).max(7).optional(),
  heightInches: z.number().int().min(0).max(11).optional(),
  weight: z.number().min(50).max(500).optional(),
  medicalConditions: z.array(z.string()).optional(),
  medications: z.string().optional(),
  duiHistory: z.boolean().optional(),
  yearsSinceLastDui: z.number().int().min(0).max(50).nullable().optional(),
  includeROP: z.boolean().optional(),
  termToAge: z.number().int().min(65).max(110).optional(),
  includeTableRatings: z.boolean().optional(),
  includeUL: z.boolean().optional(),
  ulPayStructure: z.string().optional(),
  compareTerms: z.boolean().optional(),
  includeFinalExpense: z.boolean().optional(),
  // Advanced underwriting fields (Phase 5)
  systolic: z.number().int().min(60).max(250).optional(),
  diastolic: z.number().int().min(30).max(150).optional(),
  bpMedication: z.boolean().optional(),
  cholesterolLevel: z.number().int().min(50).max(500).optional(),
  hdlRatio: z.number().min(1).max(20).optional(),
  cholesterolMedication: z.boolean().optional(),
  familyHeartDisease: z.boolean().optional(),
  familyCancer: z.boolean().optional(),
  alcoholHistory: z.boolean().optional(),
  alcoholYearsSince: z.number().int().min(0).max(50).optional(),
  drugHistory: z.boolean().optional(),
  drugYearsSince: z.number().int().min(0).max(50).optional(),
})

const NICOTINE_LABELS: Record<string, string> = {
  cigarettes: "Cigarettes",
  vaping: "Vaping",
  cigars: "Cigars",
  smokeless: "Smokeless",
  pouches: "Pouches",
  marijuana: "Marijuana",
  nrt: "NRT",
}

function buildClientSummary(
  age: number,
  gender: Gender,
  state: string,
  coverageAmount: number,
  termLength: TermLength,
  tobaccoStatus: TobaccoStatus,
  nicotineType?: NicotineType,
): string {
  const genderAbbr = gender === "Male" ? "M" : "F"
  const coverageLabel =
    coverageAmount >= 1_000_000
      ? `$${coverageAmount / 1_000_000}M`
      : `$${coverageAmount / 1_000}K`

  let tobaccoLabel: string
  if (tobaccoStatus === "non-smoker") {
    tobaccoLabel = "Non-Tobacco"
  } else if (nicotineType && nicotineType !== "none" && nicotineType !== "cigarettes") {
    tobaccoLabel = `Tobacco (${NICOTINE_LABELS[nicotineType] ?? nicotineType})`
  } else {
    tobaccoLabel = "Tobacco"
  }

  return `${age}yo ${genderAbbr} | ${state} | ${coverageLabel} | ${termLength}Y | ${tobaccoLabel}`
}

function buildFeatures(
  carrier: (typeof CARRIERS)[number],
  product: (typeof CARRIERS)[number]["products"][number],
): string[] {
  const features: string[] = []

  if (product.conversionAge) {
    features.push(`Convertible until age ${product.conversionAge}`)
  }

  if (product.hasROP) {
    features.push("Return of Premium available")
  }

  if (carrier.livingBenefits && carrier.livingBenefits !== "None specified") {
    features.push(`Living benefits: ${carrier.livingBenefits}`)
  }

  if (carrier.operational.eSign) {
    features.push("E-sign available")
  }

  if (carrier.tobacco.keyNote) {
    features.push(carrier.tobacco.keyNote)
  }

  return features.slice(0, 4)
}

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.quote, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const body: unknown = await request.json()
    const parsed = quoteRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const {
      age,
      gender,
      state,
      coverageAmount,
      termLength,
      tobaccoStatus,
      nicotineType,
      heightFeet,
      heightInches,
      weight,
      medicalConditions,
      medications,
      duiHistory,
      yearsSinceLastDui,
      includeROP,
      termToAge,
      includeTableRatings,
      includeUL,
      ulPayStructure,
      compareTerms,
      includeFinalExpense,
      systolic,
      diastolic,
      bpMedication,
      cholesterolLevel,
      hdlRatio,
      cholesterolMedication,
      familyHeartDisease,
      familyCancer,
      alcoholHistory,
      alcoholYearsSince,
      drugHistory,
      drugYearsSince,
    } = parsed.data

    const hasBuildData =
      heightFeet !== undefined &&
      heightInches !== undefined &&
      weight !== undefined

    // Determine if we need dual pricing (smoker who uses a non-cigarette nicotine type)
    const needsDualPricing =
      tobaccoStatus === "smoker" &&
      nicotineType !== undefined &&
      nicotineType !== "none" &&
      nicotineType !== "cigarettes"

    const basePricingRequest = {
      age,
      gender,
      state,
      coverageAmount,
      termLength,
      heightFeet,
      heightInches,
      weight,
      medicalConditions,
      duiHistory,
      nicotineType,
      systolic,
      diastolic,
      bpMedication,
      cholesterolLevel,
      hdlRatio,
      cholesterolMedication,
      familyHeartDisease,
      familyCancer,
      alcoholHistory,
      alcoholYearsSince,
      drugHistory,
      drugYearsSince,
    }

    // Group pricing results by carrier ID
    function groupByCarrier(results: PricingResult[]): Map<string, PricingResult[]> {
      const map = new Map<string, PricingResult[]>()
      for (const r of results) {
        const existing = map.get(r.carrierId)
        if (existing) {
          existing.push(r)
        } else {
          map.set(r.carrierId, [r])
        }
      }
      return map
    }

    let pricesByCarrier: Map<string, PricingResult[]>

    if (needsDualPricing) {
      // Two parallel calls: smoker rates and non-smoker rates
      const [smokerResults, nonSmokerResults] = await Promise.all([
        pricingProvider.getQuotes({ ...basePricingRequest, tobaccoStatus: "smoker" }),
        pricingProvider.getQuotes({ ...basePricingRequest, tobaccoStatus: "non-smoker" }),
      ])

      const smokerMap = groupByCarrier(smokerResults)
      const nonSmokerMap = groupByCarrier(nonSmokerResults)

      // For each carrier, pick the correct rate set based on how they classify this nicotine type
      pricesByCarrier = new Map()
      for (const carrier of CARRIERS) {
        const classification = classifyTobaccoForCarrier(nicotineType, carrier)
        const sourceMap = classification === "non-smoker" ? nonSmokerMap : smokerMap
        const pricings = sourceMap.get(carrier.id)
        if (pricings && pricings.length > 0) {
          pricesByCarrier.set(carrier.id, pricings)
        }
      }
    } else {
      // Single call (standard path)
      const pricingResults = await pricingProvider.getQuotes({
        ...basePricingRequest,
        tobaccoStatus,
      })
      pricesByCarrier = groupByCarrier(pricingResults)
    }


    // ROP pricing — parallel call with ROP category if requested
    let ropPricesByCarrier: Map<string, PricingResult[]> = new Map()
    const ropCategory = includeROP ? getRopCategory(termLength) : null

    if (ropCategory) {
      try {
        const ropResults = await pricingProvider.getQuotes({
          ...basePricingRequest,
          tobaccoStatus,
          categoryOverride: ropCategory,
        })
        // Tag all ROP results with productCategory
        const taggedRop = ropResults.map((r) => ({ ...r, productCategory: "rop" as const }))
        ropPricesByCarrier = groupByCarrier(taggedRop)
      } catch {
        // ROP call failure is non-fatal — continue with standard term quotes
      }
    }

    // Term-to-Age pricing — parallel call with level-to-age category if requested
    let termToAgePricesByCarrier: Map<string, PricingResult[]> = new Map()
    const termToAgeCategory = termToAge ? getTermToAgeCategory(termToAge) : null

    if (termToAgeCategory) {
      try {
        const ttaResults = await pricingProvider.getQuotes({
          ...basePricingRequest,
          tobaccoStatus,
          categoryOverride: termToAgeCategory,
        })
        const taggedTta = ttaResults.map((r) => ({ ...r, productCategory: "term-to-age" as const }))
        termToAgePricesByCarrier = groupByCarrier(taggedTta)
      } catch {
        // Term-to-age call failure is non-fatal
      }
    }

    // Table-rated pricing — parallel calls for T1-T4 when requested
    const TABLE_RATINGS = [
      { code: "T1", label: "Table 1 (+25%)" },
      { code: "T2", label: "Table 2 (+50%)" },
      { code: "T3", label: "Table 3 (+75%)" },
      { code: "T4", label: "Table 4 (+100%)" },
    ] as const

    let tableRatedByCode: Map<string, Map<string, PricingResult[]>> = new Map()

    if (includeTableRatings) {
      try {
        const tableResults = await Promise.all(
          TABLE_RATINGS.map(async (tr) => {
            try {
              const results = await pricingProvider.getQuotes({
                ...basePricingRequest,
                tobaccoStatus,
                healthClassOverride: tr.code,
              })
              return { rating: tr, results }
            } catch {
              return { rating: tr, results: [] as PricingResult[] }
            }
          }),
        )
        for (const { rating, results } of tableResults) {
          tableRatedByCode.set(rating.code, groupByCarrier(results))
        }
      } catch {
        // Table rating calls are non-fatal
      }
    }

    // ROP-to-Age pricing — when both ROP and term-to-age are requested (W/X/Y categories)
    let ropToAgePricesByCarrier: Map<string, PricingResult[]> = new Map()
    const ropToAgeCategory = (includeROP && termToAge) ? getRopToAgeCategory(termToAge) : null

    if (ropToAgeCategory) {
      try {
        const rtaResults = await pricingProvider.getQuotes({
          ...basePricingRequest,
          tobaccoStatus,
          categoryOverride: ropToAgeCategory,
        })
        const taggedRta = rtaResults.map((r) => ({ ...r, productCategory: "rop-to-age" as const }))
        ropToAgePricesByCarrier = groupByCarrier(taggedRta)
      } catch {
        // ROP-to-age call failure is non-fatal
      }
    }

    // No-Lapse Universal Life pricing — category 8
    let ulPricesByCarrier: Map<string, PricingResult[]> = new Map()

    if (includeUL) {
      try {
        const ulCategory = ulPayStructure || "8"
        const ulResults = await pricingProvider.getQuotes({
          ...basePricingRequest,
          tobaccoStatus,
          categoryOverride: ulCategory,
        })
        const taggedUl = ulResults.map((r) => ({ ...r, productCategory: "ul" as const }))
        ulPricesByCarrier = groupByCarrier(taggedUl)
      } catch {
        // UL call failure is non-fatal
      }
    }

    // Term comparison — parallel calls for all standard terms except the current one
    const COMPARISON_TERMS = [10, 15, 20, 25, 30] as const
    let termComparisonByLength: Map<number, Map<string, PricingResult[]>> = new Map()

    if (compareTerms) {
      const otherTerms = COMPARISON_TERMS.filter((t) => t !== termLength)
      try {
        const compResults = await Promise.all(
          otherTerms.map(async (t) => {
            const categoryCode = ({ 10: "3", 15: "4", 20: "5", 25: "6", 30: "7" } as Record<number, string>)[t]
            if (!categoryCode) return { term: t, results: [] as PricingResult[] }
            try {
              const results = await pricingProvider.getQuotes({
                ...basePricingRequest,
                tobaccoStatus,
                categoryOverride: categoryCode,
              })
              return { term: t, results }
            } catch {
              return { term: t, results: [] as PricingResult[] }
            }
          }),
        )
        for (const { term, results } of compResults) {
          termComparisonByLength.set(term, groupByCarrier(results))
        }
      } catch {
        // Term comparison calls are non-fatal
      }
    }

    // Final Expense pricing — category Y (simplified issue whole life)
    let fePricesByCarrier: Map<string, PricingResult[]> = new Map()

    if (includeFinalExpense) {
      try {
        // FE uses "R" (Standard) health class — simplified issue, not PP/P/RP/R
        // NY state code: use "52" (Non-Business) instead of "33" (Business) for personal FE policies
        const feStateOverride = state.toLowerCase() === "new york" || state === "NY" ? "52" : undefined
        const feResults = await pricingProvider.getQuotes({
          ...basePricingRequest,
          tobaccoStatus,
          categoryOverride: "Y",
          healthClassOverride: "R",
          stateCodeOverride: feStateOverride,
        })
        const taggedFe = feResults.map((r) => ({ ...r, productCategory: "final-expense" as const }))
        fePricesByCarrier = groupByCarrier(taggedFe)
      } catch {
        // FE call failure is non-fatal
      }
    }

    const eligiblePrices: Array<{
      carrierId: string
      monthlyPremium: number
    }> = []

    const preliminaryQuotes: Array<{
      carrier: (typeof CARRIERS)[number]
      product: (typeof CARRIERS)[number]["products"][number]
      monthlyPremium: number
      annualPremium: number
      isEligible: boolean
      ineligibilityReason?: string
      pricingSource?: "compulife" | "mock"
      productCode?: string
      isGuaranteed?: boolean
      compulifeAmBest?: string
      riskClass?: string
      productCategory?: "term" | "rop" | "term-to-age" | "rop-to-age" | "table-rated" | "ul" | "term-comparison" | "final-expense"
      tableRating?: string
      termComparisonLength?: number
      quarterlyPremium?: number
      semiAnnualPremium?: number
      amBestDate?: string
      healthAnalyzerStatus?: "go" | "nogo" | "unknown"
      healthAnalyzerReason?: string
      finalExpenseType?: "level" | "graded" | "guaranteed-issue"
    }> = []

    const buildResultsByCarrier = new Map<
      string,
      ReturnType<typeof checkBuildChart>
    >()

    if (hasBuildData) {
      for (const carrier of CARRIERS) {
        buildResultsByCarrier.set(
          carrier.id,
          checkBuildChart(carrier.id, gender, heightFeet, heightInches, weight),
        )
      }
    }

    for (const carrier of CARRIERS) {
      const buildCheck = buildResultsByCarrier.get(carrier.id)
      const eligibility = checkEligibility(
        carrier,
        age,
        state,
        coverageAmount,
        termLength,
        { duiHistory, yearsSinceLastDui, medicalConditions, buildCheck },
      )

      if (eligibility.isEligible && eligibility.matchedProduct) {
        const pricings = pricesByCarrier.get(carrier.id) ?? []

        if (pricings.length === 0) {
          // No pricing data — use matched product with 0 price
          eligiblePrices.push({ carrierId: carrier.id, monthlyPremium: 0 })
          preliminaryQuotes.push({
            carrier,
            product: eligibility.matchedProduct,
            monthlyPremium: 0,
            annualPremium: 0,
            isEligible: true,
          })
        } else {
          // Use cheapest product for carrier-level price ranking
          const cheapestMonthly = Math.min(...pricings.map((p) => p.monthlyPremium))
          eligiblePrices.push({ carrierId: carrier.id, monthlyPremium: cheapestMonthly })

          // Create one quote per product variant
          for (const pricing of pricings) {
            preliminaryQuotes.push({
              carrier,
              product: eligibility.matchedProduct,
              monthlyPremium: pricing.monthlyPremium,
              annualPremium: pricing.annualPremium,
              isEligible: true,
              pricingSource: pricing.source,
              productCode: pricing.productCode,
              isGuaranteed: pricing.isGuaranteed,
              compulifeAmBest: pricing.amBestRating,
              riskClass: pricing.riskClass,
              productCategory: "term",
              quarterlyPremium: pricing.quarterlyPremium,
              semiAnnualPremium: pricing.semiAnnualPremium,
              amBestDate: pricing.amBestDate,
              healthAnalyzerStatus: pricing.healthAnalyzerStatus,
              healthAnalyzerReason: pricing.healthAnalyzerReason,
            })
          }
        }

        // Add ROP quotes for this carrier (if available)
        const ropPricings = ropPricesByCarrier.get(carrier.id) ?? []
        for (const pricing of ropPricings) {
          preliminaryQuotes.push({
            carrier,
            product: eligibility.matchedProduct,
            monthlyPremium: pricing.monthlyPremium,
            annualPremium: pricing.annualPremium,
            isEligible: true,
            pricingSource: pricing.source,
            productCode: pricing.productCode,
            isGuaranteed: pricing.isGuaranteed,
            compulifeAmBest: pricing.amBestRating,
            riskClass: pricing.riskClass,
            productCategory: "rop",
          })
        }

        // Add Term-to-Age quotes for this carrier (if available)
        const ttaPricings = termToAgePricesByCarrier.get(carrier.id) ?? []
        for (const pricing of ttaPricings) {
          preliminaryQuotes.push({
            carrier,
            product: eligibility.matchedProduct,
            monthlyPremium: pricing.monthlyPremium,
            annualPremium: pricing.annualPremium,
            isEligible: true,
            pricingSource: pricing.source,
            productCode: pricing.productCode,
            isGuaranteed: pricing.isGuaranteed,
            compulifeAmBest: pricing.amBestRating,
            riskClass: pricing.riskClass,
            productCategory: "term-to-age",
          })
        }

        // Add Table-Rated quotes for this carrier (if available)
        for (const [trCode, byCarrier] of tableRatedByCode) {
          const trPricings = byCarrier.get(carrier.id) ?? []
          // Use cheapest product per carrier for table-rated (avoid flooding)
          const cheapest = trPricings.length > 0
            ? trPricings.reduce((a, b) => a.monthlyPremium < b.monthlyPremium ? a : b)
            : null
          if (cheapest) {
            preliminaryQuotes.push({
              carrier,
              product: eligibility.matchedProduct,
              monthlyPremium: cheapest.monthlyPremium,
              annualPremium: cheapest.annualPremium,
              isEligible: true,
              pricingSource: cheapest.source,
              productCode: cheapest.productCode,
              isGuaranteed: cheapest.isGuaranteed,
              compulifeAmBest: cheapest.amBestRating,
              riskClass: cheapest.riskClass,
              productCategory: "table-rated",
              tableRating: trCode,
            })
          }
        }

        // Add ROP-to-Age quotes (if available)
        const rtaPricings = ropToAgePricesByCarrier.get(carrier.id) ?? []
        for (const pricing of rtaPricings) {
          preliminaryQuotes.push({
            carrier,
            product: eligibility.matchedProduct,
            monthlyPremium: pricing.monthlyPremium,
            annualPremium: pricing.annualPremium,
            isEligible: true,
            pricingSource: pricing.source,
            productCode: pricing.productCode,
            isGuaranteed: pricing.isGuaranteed,
            compulifeAmBest: pricing.amBestRating,
            riskClass: pricing.riskClass,
            productCategory: "rop-to-age",
          })
        }

        // Add No-Lapse UL quotes (if available)
        const ulPricings = ulPricesByCarrier.get(carrier.id) ?? []
        for (const pricing of ulPricings) {
          preliminaryQuotes.push({
            carrier,
            product: eligibility.matchedProduct,
            monthlyPremium: pricing.monthlyPremium,
            annualPremium: pricing.annualPremium,
            isEligible: true,
            pricingSource: pricing.source,
            productCode: pricing.productCode,
            isGuaranteed: pricing.isGuaranteed,
            compulifeAmBest: pricing.amBestRating,
            riskClass: pricing.riskClass,
            productCategory: "ul",
          })
        }

        // Add Term Comparison quotes (if available)
        for (const [compTerm, byCarrier] of termComparisonByLength) {
          const compPricings = byCarrier.get(carrier.id) ?? []
          // Use cheapest product per carrier per term (one row per term)
          const cheapest = compPricings.length > 0
            ? compPricings.reduce((a, b) => a.monthlyPremium < b.monthlyPremium ? a : b)
            : null
          if (cheapest) {
            preliminaryQuotes.push({
              carrier,
              product: eligibility.matchedProduct,
              monthlyPremium: cheapest.monthlyPremium,
              annualPremium: cheapest.annualPremium,
              isEligible: true,
              pricingSource: cheapest.source,
              productCode: cheapest.productCode,
              isGuaranteed: cheapest.isGuaranteed,
              compulifeAmBest: cheapest.amBestRating,
              riskClass: cheapest.riskClass,
              productCategory: "term-comparison",
              termComparisonLength: compTerm,
            })
          }
        }
      } else {
        const fallbackProduct = carrier.products.find(
          (p) => p.type === "term",
        )

        if (fallbackProduct) {
          preliminaryQuotes.push({
            carrier,
            product: fallbackProduct,
            monthlyPremium: 0,
            annualPremium: 0,
            isEligible: false,
            ineligibilityReason: eligibility.ineligibilityReason,
          })
        }
      }
    }

    // Add Final Expense quotes — these bypass eligibility (Compulife handles state/age filtering)
    if (includeFinalExpense && fePricesByCarrier.size > 0) {
      for (const [, pricings] of fePricesByCarrier) {
        for (const pricing of pricings) {
          // Find matching carrier in our system, or create a minimal entry
          const matchedCarrier = CARRIERS.find((c) => c.id === pricing.carrierId)
          if (!matchedCarrier) continue

          const fallbackProduct = matchedCarrier.products[0]
          if (!fallbackProduct) continue

          // Classify FE product type from product name
          const productNameLower = pricing.productName.toLowerCase()
          const finalExpenseType: "level" | "graded" | "guaranteed-issue" =
            productNameLower.includes("guaranteed issue") || productNameLower.includes("guaranteed acceptance")
              ? "guaranteed-issue"
              : productNameLower.includes("graded")
                ? "graded"
                : "level"

          preliminaryQuotes.push({
            carrier: matchedCarrier,
            product: fallbackProduct,
            monthlyPremium: pricing.monthlyPremium,
            annualPremium: pricing.annualPremium,
            isEligible: true,
            pricingSource: pricing.source,
            productCode: pricing.productCode,
            isGuaranteed: pricing.isGuaranteed,
            compulifeAmBest: pricing.amBestRating,
            riskClass: pricing.riskClass,
            productCategory: "final-expense",
            quarterlyPremium: pricing.quarterlyPremium,
            semiAnnualPremium: pricing.semiAnnualPremium,
            amBestDate: pricing.amBestDate,
            healthAnalyzerStatus: pricing.healthAnalyzerStatus,
            healthAnalyzerReason: pricing.healthAnalyzerReason,
            finalExpenseType,
          })
        }
      }
    }

    const priceRanks = rankByPrice(eligiblePrices)

    // Rate class spread — parallel calls for other health classes
    const RATE_CLASSES = [
      { code: "PP", label: "Preferred Plus" },
      { code: "P", label: "Preferred" },
      { code: "RP", label: "Regular Plus" },
      { code: "R", label: "Standard" },
    ] as const

    const primaryHealthClass = mapHealthClass({
      ...basePricingRequest,
      tobaccoStatus,
    })

    // Only fire spread calls if we have eligible carriers and aren't in dual pricing mode
    const spreadByQuoteKey = new Map<string, RateClassPrice[]>()

    if (eligiblePrices.length > 0 && !needsDualPricing) {
      const otherClasses = RATE_CLASSES.filter((rc) => rc.code !== primaryHealthClass)

      const spreadResults = await Promise.all(
        otherClasses.map(async (rc) => {
          try {
            const results = await pricingProvider.getQuotes({
              ...basePricingRequest,
              tobaccoStatus,
              healthClassOverride: rc.code,
            })
            return { rateClass: rc, results }
          } catch {
            return { rateClass: rc, results: [] as PricingResult[] }
          }
        }),
      )

      // Build spread map keyed by carrierId:productCode
      for (const { rateClass, results } of spreadResults) {
        for (const r of results) {
          if (r.annualPremium <= 0) continue
          const key = `${r.carrierId}:${r.productCode ?? ""}`
          const existing = spreadByQuoteKey.get(key)
          const entry: RateClassPrice = {
            rateClass: rateClass.label,
            rateClassCode: rateClass.code,
            monthlyPremium: r.monthlyPremium,
            annualPremium: r.annualPremium,
          }
          if (existing) {
            existing.push(entry)
          } else {
            spreadByQuoteKey.set(key, [entry])
          }
        }
      }

      // Add the primary class pricing from preliminary quotes
      for (const pq of preliminaryQuotes) {
        if (!pq.isEligible || pq.monthlyPremium <= 0) continue
        const key = `${pq.carrier.id}:${pq.productCode ?? ""}`
        const primaryLabel = RATE_CLASSES.find((rc) => rc.code === primaryHealthClass)?.label ?? primaryHealthClass
        const entry: RateClassPrice = {
          rateClass: primaryLabel,
          rateClassCode: primaryHealthClass,
          monthlyPremium: pq.monthlyPremium,
          annualPremium: pq.annualPremium,
        }
        const existing = spreadByQuoteKey.get(key)
        if (existing) {
          existing.push(entry)
        } else {
          spreadByQuoteKey.set(key, [entry])
        }
      }

      // Sort each spread by premium ascending
      for (const [, spread] of spreadByQuoteKey) {
        spread.sort((a, b) => a.annualPremium - b.annualPremium)
      }
    }

    // Best value = cheapest eligible quote across all products
    let lowestPrice = Infinity
    let bestValueKey: string | null = null
    for (const pq of preliminaryQuotes) {
      if (pq.isEligible && pq.monthlyPremium > 0 && pq.monthlyPremium < lowestPrice) {
        lowestPrice = pq.monthlyPremium
        bestValueKey = `${pq.carrier.id}:${pq.productCode ?? ""}`
      }
    }

    const quotes: CarrierQuote[] = preliminaryQuotes.map((pq) => {
      const buildResult = buildResultsByCarrier.get(pq.carrier.id)

      // Prescription screening (structured carrier Rx exclusions)
      const rxResults = medications
        ? checkPrescriptionScreening(pq.carrier, medications)
        : []
      const rxDeclineCount = rxResults.filter((r) => r.action === "DECLINE").length
      const rxReviewCount = rxResults.filter((r) => r.action === "REVIEW").length

      // Individual medical condition checks (structured carrier rules)
      const medicalResults =
        medicalConditions && medicalConditions.length > 0
          ? checkStructuredMedicalEligibility(pq.carrier, medicalConditions)
          : []
      const medicalDeclines = medicalResults.filter((m) => m.decision === "DECLINE")

      // Combination decline checks
      const comboResults =
        medicalConditions && medicalConditions.length >= 2
          ? checkCombinationDeclines(pq.carrier, medicalConditions)
          : []
      const comboDeclineCount = comboResults.length

      const matchScore = calculateMatchScore({
        carrier: pq.carrier,
        tobaccoStatus,
        nicotineType,
        isStateEligible: pq.isEligible,
        priceRank: priceRanks.get(pq.carrier.id) ?? 999,
        medicalConditions,
        buildRateClass: buildResult?.rateClassImpact,
        rxDeclineCount: rxDeclineCount + medicalDeclines.length,
        rxReviewCount,
        comboDeclineCount,
      })

      // Legacy medication screening (lib/data/medications.ts database)
      const medFlags = medications
        ? getMedicationWarnings(medications, pq.carrier.id).map((w) => ({
            medication: w.medication,
            condition: w.condition,
            action: w.action,
            detail: w.detail,
          }))
        : undefined

      // Build underwriting warnings from medical conditions, Rx screening, combo declines
      const warnings: UnderwritingWarning[] = []
      for (const med of medicalResults) {
        if (med.decision === "DECLINE") {
          warnings.push({
            type: "medical_decline",
            label: med.conditionLabel,
            detail: med.conditions ?? med.notes ?? "Carrier declines this condition",
          })
        } else if (med.decision === "REVIEW" || med.decision === "CONDITIONAL") {
          warnings.push({
            type: "medical_review",
            label: med.conditionLabel,
            detail: med.conditions ?? med.notes ?? undefined,
          })
        }
      }
      for (const rx of rxResults) {
        const warnType = rx.action === "DECLINE"
          ? "rx_decline"
          : rx.action === "GRADED_ELIGIBLE"
            ? "rx_graded"
            : "rx_review"
        warnings.push({
          type: warnType,
          label: rx.medication,
          detail: rx.associatedCondition
            ? `${rx.associatedCondition}${rx.notes ? ` — ${rx.notes}` : ""}`
            : rx.notes ?? undefined,
        })
      }
      for (const combo of comboResults) {
        warnings.push({
          type: "combo_decline",
          label: combo.matchedConditions.join(" + "),
          detail: combo.notes ?? undefined,
        })
      }

      const medicalDeclined = medicalDeclines.length > 0
      const rxDeclined = rxDeclineCount > 0
      const comboDeclined = comboResults.some((c) => c.decision === "DECLINE")
      const finalEligible = pq.isEligible && !medicalDeclined && !rxDeclined && !comboDeclined
      const finalReason = medicalDeclined
        ? `Medical decline: ${medicalDeclines.map((m) => m.conditionLabel).join(", ")}`
        : comboDeclined
          ? `Declined: ${comboResults.filter((c) => c.decision === "DECLINE").map((c) => c.matchedConditions.join(" + ")).join("; ")} combination`
          : rxDeclined
            ? `Medication exclusion: ${rxResults.filter((r) => r.action === "DECLINE").map((r) => r.medication).join(", ")}`
            : pq.ineligibilityReason

      // Use Compulife AM Best when available, fall back to static data
      const effectiveCarrier = pq.compulifeAmBest
        ? { ...pq.carrier, amBest: pq.compulifeAmBest as typeof pq.carrier.amBest }
        : pq.carrier

      // Attach rate class spread if available
      const quoteSpreadKey = `${pq.carrier.id}:${pq.productCode ?? ""}`
      const spread = spreadByQuoteKey.get(quoteSpreadKey)

      return {
        carrier: effectiveCarrier,
        product: pq.product,
        monthlyPremium: pq.monthlyPremium,
        annualPremium: pq.annualPremium,
        matchScore,
        isEligible: finalEligible,
        ineligibilityReason: finalReason,
        isBestValue: `${pq.carrier.id}:${pq.productCode ?? ""}` === bestValueKey,
        features: buildFeatures(pq.carrier, pq.product),
        medicationFlags: medFlags && medFlags.length > 0 ? medFlags : undefined,
        underwritingWarnings: warnings.length > 0 ? warnings : undefined,
        pricingSource: pq.pricingSource,
        productCode: pq.productCode,
        isGuaranteed: pq.isGuaranteed,
        compulifeAmBest: pq.compulifeAmBest,
        riskClass: pq.riskClass,
        rateClassSpread: spread && spread.length > 1 ? spread : undefined,
        productCategory: pq.productCategory,
        tableRating: pq.tableRating,
        termComparisonLength: pq.termComparisonLength,
        quarterlyPremium: pq.quarterlyPremium,
        semiAnnualPremium: pq.semiAnnualPremium,
        amBestDate: pq.amBestDate,
        healthAnalyzerStatus: pq.healthAnalyzerStatus,
        healthAnalyzerReason: pq.healthAnalyzerReason,
        finalExpenseType: pq.finalExpenseType,
      }
    })

    quotes.sort((a, b) => b.matchScore - a.matchScore)

    const response: QuoteResponse = {
      quotes,
      clientSummary: buildClientSummary(
        age,
        gender,
        state,
        coverageAmount,
        termLength,
        tobaccoStatus,
        nicotineType,
      ),
      totalCarriersChecked: CARRIERS.length,
      eligibleCount: eligiblePrices.length,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process quote request" },
      { status: 500 },
    )
  }
}
