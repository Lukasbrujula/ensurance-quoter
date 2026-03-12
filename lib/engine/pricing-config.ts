import { CompulifePricingProvider } from "./compulife-provider"
import type { PricingProvider } from "./pricing"

/**
 * Pricing provider configuration.
 *
 * Uses Compulife cloud API exclusively. If Compulife is unreachable,
 * the error propagates to the caller — no fake prices, ever.
 *
 * Requires COMPULIFE_AUTH_ID (local dev) or COMPULIFE_PROXY_URL (production).
 */

function createPricingProvider(): PricingProvider {
  if (!process.env.COMPULIFE_AUTH_ID && !process.env.COMPULIFE_PROXY_URL) {
    throw new Error(
      "Pricing service not configured: set COMPULIFE_AUTH_ID or COMPULIFE_PROXY_URL",
    )
  }
  return new CompulifePricingProvider()
}

export const pricingProvider: PricingProvider = createPricingProvider()
