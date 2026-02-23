"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, Users, Zap, Bot, Settings, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth/auth-provider"
import { createAuthBrowserClient } from "@/lib/supabase/auth-client"

const NAV_LINKS = [
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/quote", label: "Quotes", icon: Zap },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

function getUserInitials(user: { email?: string; user_metadata?: Record<string, unknown> } | null): string {
  if (!user) return "??"
  const first = (user.user_metadata?.first_name as string) ?? ""
  const last = (user.user_metadata?.last_name as string) ?? ""
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  const email = user.email ?? ""
  return email.slice(0, 2).toUpperCase()
}

function getUserDisplayName(user: { email?: string; user_metadata?: Record<string, unknown> } | null): string {
  if (!user) return ""
  const first = (user.user_metadata?.first_name as string) ?? ""
  const last = (user.user_metadata?.last_name as string) ?? ""
  if (first || last) return [first, last].filter(Boolean).join(" ")
  return user.email ?? ""
}

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = getUserInitials(user)
  const displayName = getUserDisplayName(user)

  function isActive(href: string): boolean {
    if (href === "/leads") return pathname.startsWith("/leads")
    if (href === "/agents") return pathname.startsWith("/agents")
    if (href === "/settings") return pathname.startsWith("/settings")
    return pathname === href
  }

  async function handleSignOut() {
    const supabase = createAuthBrowserClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <nav aria-label="Main navigation" className="border-b border-[#e2e8f0] bg-white">
      <div className="flex h-11 items-center justify-between px-4 lg:px-6">
        {/* Brand */}
        <Link href="/quote" className="flex items-center gap-2">
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

        {/* Agent avatar dropdown (desktop) */}
        <div className="hidden items-center gap-3 lg:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e293b] text-[10px] font-bold text-white transition-opacity hover:opacity-80"
                aria-label="Account menu"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{displayName}</p>
                {user?.email && displayName !== user.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="mt-2 border-t border-[#e2e8f0] pt-2">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e293b] text-[10px] font-bold text-white">
                {initials}
              </div>
              <span className="text-[12px] text-[#64748b]">{displayName}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                handleSignOut()
              }}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
