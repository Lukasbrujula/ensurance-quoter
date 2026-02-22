import { MockPricingProvider } from "./mock-provider"
import type { PricingProvider } from "./pricing"

// Swap this to CompulifePricingProvider when ready
export const pricingProvider: PricingProvider = new MockPricingProvider()
