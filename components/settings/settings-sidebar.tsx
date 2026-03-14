"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"

const SETTINGS_NAV = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/licenses", label: "Licenses", icon: Award },
  { href: "/settings/carriers", label: "My Carriers", icon: ShieldCheck },
  { href: "/settings/business", label: "Business Knowledge", icon: Building2 },
  { href: "/settings/phone-numbers", label: "Phone Numbers", icon: Phone },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/settings/billing", label: "Billing & Plans", icon: CreditCard },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/preferences", label: "Preferences", icon: Settings },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/custom-fields", label: "Custom Fields", icon: ListPlus },
  { href: "/settings/commissions", label: "Commissions", icon: DollarSign },
  { href: "/settings/usage", label: "Usage", icon: BarChart3 },
] as const

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav
        aria-label="Settings navigation"
        className="hidden shrink-0 md:sticky md:top-6 md:self-start md:block md:w-56"
      >
        <ul className="space-y-0.5">
          {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
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
                </Link>
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
          {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
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
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
