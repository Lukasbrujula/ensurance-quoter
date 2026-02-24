import { CompulifePricingProvider } from "./compulife-provider"
import { MockPricingProvider } from "./mock-provider"
import type { PricingProvider } from "./pricing"

function createPricingProvider(): PricingProvider {
  if (process.env.COMPULIFE_API_URL && process.env.COMPULIFE_API_KEY) {
    return new CompulifePricingProvider()
  }
  return new MockPricingProvider()
}

export const pricingProvider: PricingProvider = createPricingProvider()
