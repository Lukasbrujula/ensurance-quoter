import { CompulifePricingProvider } from "./compulife-provider"
import { MockPricingProvider } from "./mock-provider"
import type { PricingProvider, PricingRequest, PricingResult } from "./pricing"

/**
 * Composite provider: tries Compulife first, falls back to mock pricing
 * if the API returns empty results (unsupported term) or errors/timeouts.
 */
class CompulifeWithMockFallback implements PricingProvider {
  name = "compulife+mock"

  private readonly compulife = new CompulifePricingProvider()
  private readonly mock = new MockPricingProvider()

  async getQuotes(request: PricingRequest): Promise<PricingResult[]> {
    let compulifeResults: PricingResult[] = []

    try {
      compulifeResults = await this.compulife.getQuotes(request)
    } catch (error) {
      console.error(
        "Compulife API failed, falling back to mock pricing:",
        error instanceof Error ? error.message : "Unknown error",
      )
      return this.mock.getQuotes(request)
    }

    if (compulifeResults.length === 0) {
      // Empty results (unsupported term length) — full mock fallback
      console.warn("Compulife returned 0 results, falling back to mock pricing")
      return this.mock.getQuotes(request)
    }

    // Supplement: fill in mock pricing for carriers Compulife didn't cover
    const coveredCarriers = new Set(compulifeResults.map((r) => r.carrierId))
    const mockResults = await this.mock.getQuotes(request)
    const supplemental = mockResults.filter((r) => !coveredCarriers.has(r.carrierId))

    return [...compulifeResults, ...supplemental]
  }
}

function createPricingProvider(): PricingProvider {
  if (process.env.COMPULIFE_AUTH_ID || process.env.COMPULIFE_PROXY_URL) {
    return new CompulifeWithMockFallback()
  }
  return new MockPricingProvider()
}

export const pricingProvider: PricingProvider = createPricingProvider()
