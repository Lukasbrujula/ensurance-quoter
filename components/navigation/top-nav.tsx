"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Users, Zap, Settings } from "lucide-react"

const NAV_LINKS = [
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/quote", label: "Quick Quote", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

export function TopNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string): boolean {
    if (href === "/leads") return pathname.startsWith("/leads")
    if (href === "/settings") return pathname.startsWith("/settings")
    return pathname === href
  }

  return (
    <nav aria-label="Main navigation" className="border-b border-[#e2e8f0] bg-white">
      <div className="flex h-11 items-center justify-between px-4 lg:px-6">
        {/* Brand */}
        <Link href="/leads" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#1773cf]">
            <span className="text-[10px] font-black text-white">E</span>
          </div>
          <span className="text-[13px] font-bold tracking-tight text-[#0f172a]">
            Ensurance
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-[#eff6ff] text-[#1773cf]"
                    : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Agent avatar (desktop) */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e293b] text-[10px] font-bold text-white">
            MV
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden rounded-sm p-1.5 text-[#64748b] hover:bg-[#f1f5f9]"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-nav-menu" className="border-t border-[#e2e8f0] px-4 py-2 lg:hidden">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-sm px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[#eff6ff] text-[#1773cf]"
                    : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
          <div className="mt-2 flex items-center gap-2 border-t border-[#e2e8f0] px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e293b] text-[10px] font-bold text-white">
              MV
            </div>
            <span className="text-[12px] text-[#64748b]">Agent Marcus V.</span>
          </div>
        </div>
      )}
    </nav>
  )
}
