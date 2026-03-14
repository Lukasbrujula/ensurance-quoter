import type { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { CreditCard, ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Billing — Ensurance",
  description: "Manage your subscription plan and billing.",
}

export default async function BillingPage() {
  const { has, orgId, orgSlug } = await auth()
  const pricingHref = orgId ? "/pricing?for=organization" : "/pricing"

  const isAgency = orgId ? has({ plan: "agency" }) : false
  const isPro = orgId ? false : has({ plan: "pro" })

  const planCard = orgId
    ? (isAgency
      ? <AgencyPlanCard orgName={orgSlug} pricingHref={pricingHref} />
      : <FreeOrgPlanCard orgName={orgSlug} pricingHref={pricingHref} />)
    : (isPro
      ? <ProPlanCard pricingHref={pricingHref} />
      : <FreePlanCard pricingHref={pricingHref} />)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Billing & Plans
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {orgId
            ? "Manage your organization\u2019s subscription and plan details."
            : "Manage your subscription and plan details."}
        </p>
      </div>

      {planCard}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment & Invoices</CardTitle>
          <CardDescription>
            Manage your payment methods and view billing history through your
            Clerk account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Payment methods and invoices are managed through your account
            profile. Open your user menu (top-right) to access account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ProPlanCard({ pricingHref }: { pricingHref: string }) {
  return (
    <Card className="border-[#1773cf]/20 bg-[#eff6ff]/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1773cf]/10">
              <Sparkles className="h-5 w-5 text-[#1773cf]" />
            </div>
            <div>
              <CardTitle className="text-base">Pro Plan</CardTitle>
              <CardDescription>Your current plan</CardDescription>
            </div>
          </div>
          <Badge className="bg-[#1773cf] text-white hover:bg-[#1773cf]/90">
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1773cf]" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="pt-2">
          <Button variant="outline" size="sm" asChild className="cursor-pointer">
            <Link href={pricingHref}>
              <CreditCard className="mr-2 h-4 w-4" />
              Change Plan
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function FreePlanCard({ pricingHref }: { pricingHref: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <CreditCard className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-base">Free Plan</CardTitle>
              <CardDescription>Your current plan</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Free</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          You&apos;re on the Free plan. Upgrade to Pro to unlock AI voice
          agents, lead enrichment, SMS messaging, and more.
        </p>
        <Button asChild className="cursor-pointer">
          <Link href={pricingHref}>
            Upgrade to Pro
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function AgencyPlanCard({
  orgName,
  pricingHref,
}: {
  orgName: string | null | undefined
  pricingHref: string
}) {
  return (
    <Card className="border-[#1773cf]/20 bg-[#eff6ff]/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1773cf]/10">
              <Sparkles className="h-5 w-5 text-[#1773cf]" />
            </div>
            <div>
              <CardTitle className="text-base">Agency Plan</CardTitle>
              <CardDescription>
                {orgName ? `Organization: ${orgName}` : "Your organization\u2019s current plan"}
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-[#1773cf] text-white hover:bg-[#1773cf]/90">
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {AGENCY_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1773cf]" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="pt-2">
          <Button variant="outline" size="sm" asChild className="cursor-pointer">
            <Link href={pricingHref}>
              <CreditCard className="mr-2 h-4 w-4" />
              Change Plan
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function FreeOrgPlanCard({
  orgName,
  pricingHref,
}: {
  orgName: string | null | undefined
  pricingHref: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <CreditCard className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-base">Free Team Plan</CardTitle>
              <CardDescription>
                {orgName ? `Organization: ${orgName}` : "Your organization\u2019s current plan"}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Free</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Your organization is on the Free plan. Upgrade to Agency to unlock
          team dashboards, per-agent stats, shared lead pools, and more.
        </p>
        <Button asChild className="cursor-pointer">
          <Link href={pricingHref}>
            Upgrade to Agency
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

const AGENCY_FEATURES = [
  "Everything in Pro, plus:",
  "Team dashboard with per-agent stats",
  "Shared lead pools and assignment",
  "Agent leaderboard and performance tracking",
  "Admin controls for team actions",
  "Organization-wide carrier settings",
  "Priority team support",
] as const

const PRO_FEATURES = [
  "AI voice agents for inbound calls",
  "Lead enrichment with People Data Labs",
  "SMS messaging and inbox",
  "Advanced carrier intelligence",
  "PDF proposal generation",
  "Priority support",
  "Unlimited quotes",
] as const
