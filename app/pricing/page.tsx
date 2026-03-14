import type { Metadata } from "next"
import { PricingTable } from "@clerk/nextjs"
import { MarketingTemplate } from "@/components/landing/templates/MarketingTemplate"

export const metadata: Metadata = {
  title: "Pricing — Ensurance",
  description:
    "Choose the right plan for your insurance agency. Get quoting, lead management, AI voice agents, and more.",
}

export default function PricingPage() {
  return (
    <MarketingTemplate>
      <section className="mx-auto max-w-5xl px-4 pt-32 pb-24 sm:px-6 lg:px-10">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Choose Your Plan
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Start free and upgrade when you need advanced features like AI voice
            agents, lead enrichment, and SMS messaging.
          </p>
        </div>
        <PricingTable />
      </section>
    </MarketingTemplate>
  )
}
