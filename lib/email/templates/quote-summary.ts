import { pickKeyFeature } from "@/lib/utils/quote-summary"
import type { CarrierQuote } from "@/lib/types/quote"

/* ------------------------------------------------------------------ */
/*  Quote Summary Email Template                                       */
/*  Inline-styled, table-based layout for maximum email client compat  */
/*  No PII: excludes medical conditions, tobacco, DUI, medications     */
/* ------------------------------------------------------------------ */

export interface QuoteSummaryEmailData {
  recipientName: string
  coverageAmount: number
  termLength: number
  topCarriers: CarrierQuote[]
  agentName: string
  agentEmail: string
  agentPhone: string | null
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`
}

function roundedMonthly(premium: number): string {
  return `$${Math.round(premium)}`
}

export function buildQuoteSummaryEmail(data: QuoteSummaryEmailData): string {
  const {
    recipientName,
    coverageAmount,
    termLength,
    topCarriers,
    agentName,
    agentEmail,
    agentPhone,
  } = data

  const carriers = topCarriers.slice(0, 3)
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const carrierRows = carriers
    .map(
      (q, i) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 14px 16px; font-size: 14px; color: #1e293b;">
          <strong>${i + 1}. ${q.carrier.name}</strong>
        </td>
        <td style="padding: 14px 16px; font-size: 14px; color: #1e293b; text-align: right;">
          <strong>${roundedMonthly(q.monthlyPremium)}/mo</strong>
        </td>
      </tr>
      <tr style="border-bottom: ${i < carriers.length - 1 ? "1px solid #e2e8f0" : "none"};">
        <td colspan="2" style="padding: 0 16px 14px; font-size: 12px; color: #64748b;">
          AM Best: ${q.carrier.amBest} &middot; ${pickKeyFeature(q)}
        </td>
      </tr>`,
    )
    .join("")

  const agentContactLine = agentPhone
    ? `${agentPhone} &middot; <a href="mailto:${agentEmail}" style="color: #1773cf; text-decoration: none;">${agentEmail}</a>`
    : `<a href="mailto:${agentEmail}" style="color: #1773cf; text-decoration: none;">${agentEmail}</a>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Ensurance</h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <p style="margin: 0; font-size: 16px; color: #1e293b; line-height: 1.5;">
                Hi ${recipientName},
              </p>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Here&rsquo;s a summary of the life insurance options we discussed. These quotes are based on the coverage parameters below.
              </p>
            </td>
          </tr>

          <!-- Coverage params -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 6px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Coverage</p>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #0f172a;">${formatCurrency(coverageAmount)}</p>
                  </td>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Term</p>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #0f172a;">${termLength} Years</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Carrier table -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Top Options</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; border-collapse: separate;">
                ${carrierRows}
              </table>
            </td>
          </tr>

          <!-- Agent contact -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px 0 0;">
                    <p style="margin: 0; font-size: 14px; color: #1e293b;">
                      <strong>${agentName}</strong>
                    </p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">
                      ${agentContactLine}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This quote summary is for informational purposes only and does not constitute a binding offer of insurance. Final premiums may vary based on underwriting. Quotes are valid as of ${date}. Please contact your agent for details.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
