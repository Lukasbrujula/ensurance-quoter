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

let _provider: PricingProvider | null = null

/**
 * Lazily creates the pricing provider on first access.
 * Deferred so the build-time "Collecting page data" phase doesn't
 * throw when env vars aren't available.
 */
function getPricingProvider(): PricingProvider {
  if (!_provider) {
    if (!process.env.COMPULIFE_AUTH_ID && !process.env.COMPULIFE_PROXY_URL) {
      throw new Error(
        "Pricing service not configured: set COMPULIFE_AUTH_ID or COMPULIFE_PROXY_URL",
      )
    }
    _provider = new CompulifePricingProvider()
  }
  return _provider
}

export const pricingProvider: PricingProvider = new Proxy(
  {} as PricingProvider,
  {
    get(_target, prop, receiver) {
      return Reflect.get(getPricingProvider(), prop, receiver)
    },
  },
)
