"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  User,
  Award,
  Building2,
  Plug,
  CreditCard,
  Users,
  Settings,
  Shield,
  DollarSign,
  BarChart3,
  Phone,
  ShieldCheck,
  ListPlus,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  readonly href: string
  readonly label: string
  readonly icon: typeof User
  readonly orgOnly?: boolean
}

const SETTINGS_NAV: readonly NavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/licenses", label: "Licenses", icon: Award },
  { href: "/settings/carriers", label: "My Carriers", icon: ShieldCheck },
  { href: "/settings/business", label: "Business Knowledge", icon: Building2 },
  { href: "/settings/phone-numbers", label: "Phone Numbers", icon: Phone },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/settings/billing", label: "Billing & Plans", icon: CreditCard },
  { href: "/settings/team", label: "Team", icon: Users, orgOnly: true },
  { href: "/settings/preferences", label: "Preferences", icon: Settings },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/custom-fields", label: "Custom Fields", icon: ListPlus },
  { href: "/settings/commissions", label: "Commissions", icon: DollarSign },
  { href: "/settings/usage", label: "Usage", icon: BarChart3 },
] as const

export function SettingsSidebar() {
  const pathname = usePathname()
  const { has, orgId, isLoaded: authLoaded } = useAuth()
  const isPro = authLoaded ? (has?.({ plan: "pro" }) ?? false) : null
  const visibleNav = SETTINGS_NAV.filter((item) => !item.orgOnly || orgId)

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav
        aria-label="Settings navigation"
        className="hidden shrink-0 md:sticky md:top-6 md:self-start md:block md:w-56"
      >
        <ul className="space-y-0.5">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            const isBilling = href === "/settings/billing"
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-l-2 border-[#1773cf] bg-[#eff6ff] text-[#1773cf]"
                      : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {isBilling && authLoaded && isPro !== null && (
                    isPro ? (
                      <Badge className="ml-auto bg-[#1773cf] text-white hover:bg-[#1773cf]/90 text-[10px] px-1.5 py-0">
                        Pro
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                        Free
                      </Badge>
                    )
                  )}
                </Link>
                {isBilling && authLoaded && isPro === false && (
                  <Link
                    href={orgId ? "/pricing?for=organization" : "/pricing"}
                    className="flex items-center gap-1 px-3 py-1 ml-6 text-xs font-medium text-[#1773cf] hover:text-[#1773cf]/80 transition-colors cursor-pointer"
                  >
                    Upgrade
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Mobile: horizontal scrollable tabs */}
      <nav
        aria-label="Settings navigation"
        className="md:hidden -mx-4 overflow-x-auto border-b border-[#e2e8f0] px-4"
      >
        <ul className="flex gap-1 pb-2">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            const isBilling = href === "/settings/billing"
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-[#eff6ff] text-[#1773cf]"
                      : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                  {isBilling && authLoaded && isPro !== null && (
                    isPro ? (
                      <Badge className="bg-[#1773cf] text-white hover:bg-[#1773cf]/90 text-[9px] px-1 py-0 leading-tight">
                        Pro
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 leading-tight">
                        Free
                      </Badge>
                    )
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
