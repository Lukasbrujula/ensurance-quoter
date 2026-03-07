import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { currentUser } from "@clerk/nextjs/server"
import { getLead } from "@/lib/supabase/leads"
import {
  generateProposalPDF,
  type ProposalCarrier,
  type ProposalData,
} from "@/lib/pdf/proposal-generator"
import { pickKeyFeature } from "@/lib/utils/quote-summary"
import type { CarrierQuote } from "@/lib/types/quote"

const requestSchema = z.object({
  leadId: z.string().uuid(),
  carrierIds: z.array(z.string().min(1)).min(1).max(3),
  includeRecommendation: z.boolean().default(true),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { leadId, carrierIds, includeRecommendation } = parsed.data

  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const userId = user.id
    const lead = await getLead(leadId, userId)
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Find latest quote with the requested carriers
    const latestQuote = lead.quoteHistory[0]
    if (!latestQuote) {
      return NextResponse.json(
        { error: "No quote history available" },
        { status: 400 },
      )
    }

    const eligibleQuotes = latestQuote.response.quotes.filter(
      (q: CarrierQuote) => q.isEligible && carrierIds.includes(q.carrier.id),
    )

    if (eligibleQuotes.length === 0) {
      return NextResponse.json(
        { error: "No matching carriers in latest quote" },
        { status: 400 },
      )
    }

    const agentName =
      [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ") || user.emailAddresses[0]?.emailAddress || "Agent"
    const agentEmail = user.emailAddresses[0]?.emailAddress || ""
    const agentPhone = (user.publicMetadata?.phone as string) || undefined
    const agencyName = (user.publicMetadata?.agency_name as string) || undefined

    const clientName =
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Client"

    const carriers: ProposalCarrier[] = eligibleQuotes.map(
      (q: CarrierQuote) => ({
        carrierName: q.carrier.name,
        monthlyPremium: q.monthlyPremium,
        annualPremium: q.annualPremium,
        riskClass: "Standard",
        amBestRating: q.carrier.amBest,
        livingBenefits:
          q.carrier.livingBenefits !== "None specified" &&
          q.carrier.livingBenefits !== "",
        eSign: q.carrier.operational.eSign,
        keyFeatures: [
          pickKeyFeature(q),
          q.carrier.livingBenefits &&
          q.carrier.livingBenefits !== "None specified"
            ? `Living Benefits: ${q.carrier.livingBenefits}`
            : null,
          q.carrier.operational.eSign ? "E-signature available" : null,
        ].filter((f): f is string => f !== null),
      }),
    )

    const proposalData: ProposalData = {
      agentName,
      agentEmail,
      agentPhone,
      agencyName,
      clientName,
      clientAge: lead.age ?? 0,
      clientState: lead.state ?? "N/A",
      coverageAmount: latestQuote.request.coverageAmount,
      termLength: latestQuote.request.termLength,
      carriers,
      generatedAt: new Date().toISOString(),
      includeRecommendation,
      disclaimer:
        "This proposal is for informational purposes only and does not constitute a binding offer of insurance. " +
        "Actual premiums may vary based on underwriting review. Coverage is subject to the terms and conditions " +
        "of the policy issued by the carrier. Rates shown are estimates based on the information provided.",
    }

    const pdfBuffer = generateProposalPDF(proposalData)
    const pdfUint8 = new Uint8Array(pdfBuffer)

    const safeName = clientName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()

    return new Response(pdfUint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proposal-${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Proposal generation failed:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to generate proposal" },
      { status: 500 },
    )
  }
}
