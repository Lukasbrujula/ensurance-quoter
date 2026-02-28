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
    try {
      const results = await this.compulife.getQuotes(request)

      if (results.length > 0) {
        return results
      }

      // Empty results (unsupported term length) — fall back to mock
      console.warn("Compulife returned 0 results, falling back to mock pricing")
      return this.mock.getQuotes(request)
    } catch (error) {
      console.error(
        "Compulife API failed, falling back to mock pricing:",
        error instanceof Error ? error.message : "Unknown error",
      )
      return this.mock.getQuotes(request)
    }
  }
}

function createPricingProvider(): PricingProvider {
  if (process.env.COMPULIFE_AUTH_ID) {
    return new CompulifeWithMockFallback()
  }
  return new MockPricingProvider()
}

export const pricingProvider: PricingProvider = createPricingProvider()
