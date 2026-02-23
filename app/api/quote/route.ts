import { NextResponse } from "next/server"
import { z } from "zod"
import { CARRIERS } from "@/lib/data/carriers"
import { quoteLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { checkEligibility } from "@/lib/engine/eligibility"
import { checkBuildChart } from "@/lib/engine/build-chart"
import { pricingProvider } from "@/lib/engine/pricing-config"
import {
  calculateMatchScore,
  rankByPrice,
} from "@/lib/engine/match-scoring"
import type {
  CarrierQuote,
  QuoteResponse,
  Gender,
  TobaccoStatus,
  TermLength,
} from "@/lib/types"

const quoteRequestSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(18).max(85),
  gender: z.enum(["Male", "Female"]),
  state: z.string().min(1),
  coverageAmount: z.number().min(25000).max(10000000),
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
})

function buildClientSummary(
  age: number,
  gender: Gender,
  state: string,
  coverageAmount: number,
  termLength: TermLength,
  tobaccoStatus: TobaccoStatus,
): string {
  const genderAbbr = gender === "Male" ? "M" : "F"
  const coverageLabel =
    coverageAmount >= 1_000_000
      ? `$${coverageAmount / 1_000_000}M`
      : `$${coverageAmount / 1_000}K`
  const tobaccoLabel =
    tobaccoStatus === "non-smoker" ? "Non-Tobacco" : "Tobacco"

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

  const rl = quoteLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

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
      heightFeet,
      heightInches,
      weight,
      medicalConditions,
      duiHistory,
      yearsSinceLastDui,
    } = parsed.data

    const hasBuildData =
      heightFeet !== undefined &&
      heightInches !== undefined &&
      weight !== undefined

    const pricingResults = await pricingProvider.getQuotes({
      age,
      gender,
      state,
      coverageAmount,
      termLength,
      tobaccoStatus,
    })

    const pricesByCarrier = new Map(
      pricingResults.map((r) => [r.carrierId, r]),
    )

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
        const pricing = pricesByCarrier.get(carrier.id)

        eligiblePrices.push({
          carrierId: carrier.id,
          monthlyPremium: pricing?.monthlyPremium ?? 0,
        })

        preliminaryQuotes.push({
          carrier,
          product: eligibility.matchedProduct,
          monthlyPremium: pricing?.monthlyPremium ?? 0,
          annualPremium: pricing?.annualPremium ?? 0,
          isEligible: true,
        })
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

    const priceRanks = rankByPrice(eligiblePrices)

    let lowestPrice = Infinity
    let bestValueCarrierId: string | null = null
    for (const ep of eligiblePrices) {
      if (ep.monthlyPremium < lowestPrice) {
        lowestPrice = ep.monthlyPremium
        bestValueCarrierId = ep.carrierId
      }
    }

    const quotes: CarrierQuote[] = preliminaryQuotes.map((pq) => {
      const buildResult = buildResultsByCarrier.get(pq.carrier.id)
      const matchScore = calculateMatchScore({
        carrier: pq.carrier,
        tobaccoStatus,
        isStateEligible: pq.isEligible,
        priceRank: priceRanks.get(pq.carrier.id) ?? 999,
        medicalConditions,
        buildRateClass: buildResult?.rateClassImpact,
      })

      return {
        carrier: pq.carrier,
        product: pq.product,
        monthlyPremium: pq.monthlyPremium,
        annualPremium: pq.annualPremium,
        matchScore,
        isEligible: pq.isEligible,
        ineligibilityReason: pq.ineligibilityReason,
        isBestValue: pq.carrier.id === bestValueCarrierId,
        features: buildFeatures(pq.carrier, pq.product),
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
