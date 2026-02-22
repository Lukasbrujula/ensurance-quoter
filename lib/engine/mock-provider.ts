import { CARRIERS } from "@/lib/data/carriers"
import { calculatePremium } from "./mock-pricing"
import type { PricingProvider, PricingRequest, PricingResult } from "./pricing"
import type { Gender, TobaccoStatus, TermLength } from "@/lib/types"

export class MockPricingProvider implements PricingProvider {
  name = "mock"

  async getQuotes(request: PricingRequest): Promise<PricingResult[]> {
    const results: PricingResult[] = []

    for (const carrier of CARRIERS) {
      const termProduct = carrier.products.find((p) => p.type === "term")
      if (!termProduct) continue

      const pricing = calculatePremium({
        carrierId: carrier.id,
        age: request.age,
        gender: request.gender as Gender,
        coverageAmount: request.coverageAmount,
        termLength: request.termLength as TermLength,
        tobaccoStatus: request.tobaccoStatus as TobaccoStatus,
      })

      results.push({
        carrierId: carrier.id,
        carrierName: carrier.name,
        productName: termProduct.name,
        monthlyPremium: pricing.monthlyPremium,
        annualPremium: pricing.annualPremium,
        source: "mock",
      })
    }

    return results
  }
}
