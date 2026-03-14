"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, LayoutDashboard, Users, Kanban, Zap, Bot, Settings, LogOut, Calendar, Sun, Moon, Mail, Wrench, History, MessageSquare, CreditCard } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, useClerk, useAuth, OrganizationSwitcher } from "@clerk/nextjs"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { NotificationBell } from "./notification-bell"

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/quote", label: "Quote", icon: Zap },
  { href: "/inbox", label: "Inbox", icon: Mail },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

function getClerkInitials(user: { firstName?: string | null; lastName?: string | null; emailAddresses: { emailAddress: string }[] } | null | undefined): string {
  if (!user) return "??"
  const first = user.firstName ?? ""
  const last = user.lastName ?? ""
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  const email = user.emailAddresses[0]?.emailAddress ?? ""
  return email.slice(0, 2).toUpperCase()
}

function getClerkDisplayName(user: { fullName?: string | null; emailAddresses: { emailAddress: string }[] } | null | undefined): string {
  if (!user) return ""
  if (user.fullName) return user.fullName
  return user.emailAddresses[0]?.emailAddress ?? ""
}

function getClerkAvatarUrl(user: { imageUrl?: string } | null | undefined): string | null {
  return user?.imageUrl ?? null
}

function AvatarCircle({ url, initials, size = "sm" }: { url: string | null; initials: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-9 w-9 text-[12px]" : "h-9 w-9 text-[12px]"
  if (url) {
    return (
      <span className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1e293b]`}>
        <Image src={url} alt="Avatar" fill className="object-cover" unoptimized />
      </span>
    )
  }
  return (
    <span className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-[#1e293b] font-bold text-white`}>
      {initials}
    </span>
  )
}

export function TopNav() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { has, orgId, isLoaded: authLoaded } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isPro = authLoaded ? (has?.({ plan: "pro" }) ?? false) : null
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = getClerkInitials(user)
  const displayName = getClerkDisplayName(user)
  const avatarUrl = getClerkAvatarUrl(user)

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard"
    if (href === "/calendar") return pathname.startsWith("/calendar")
    if (href === "/leads") return pathname.startsWith("/leads")
    if (href === "/pipeline") return pathname.startsWith("/pipeline")
    if (href === "/inbox") return pathname.startsWith("/inbox")
    if (href === "/agents") return pathname.startsWith("/agents")
    if (href === "/assistant") return pathname.startsWith("/assistant")
    if (href === "/tools") return pathname.startsWith("/tools")
    if (href === "/history") return pathname.startsWith("/history")
    if (href === "/settings") return pathname.startsWith("/settings")
    return pathname === href
  }

  async function handleSignOut() {
    await signOut({ redirectUrl: "/" })
  }

  return (
    <nav aria-label="Main navigation" className="border-b-2 border-border bg-background">
      <div className="flex h-[72px] items-center justify-between px-4 lg:px-6">
        {/* Brand */}
        <Link href="/quote" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1773cf]">
            <span className="text-[13px] font-black text-white">E</span>
          </div>
          <span className="text-[16px] font-bold tracking-tight text-foreground">
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
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-[14px] font-medium transition-colors ${
                  active
                    ? "bg-[#eff6ff] text-[#1773cf] dark:bg-[#1773cf]/15"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Org switcher + Theme toggle + Notifications + Agent avatar dropdown (desktop) */}
        <div className="hidden items-center gap-3 lg:flex">
          <OrganizationSwitcher
            hidePersonal={false}
            afterSelectPersonalUrl="/quote"
            afterSelectOrganizationUrl="/quote"
            appearance={{
              elements: {
                rootBox: "flex items-center",
                organizationSwitcherTrigger:
                  "rounded-md border border-border px-2.5 py-1.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer",
              },
            }}
          />
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-[22px] w-[22px]" />
            ) : (
              <Moon className="h-[22px] w-[22px]" />
            )}
          </button>
          <NotificationBell />
          {authLoaded && isPro !== null && (
            <Link href="/settings/billing">
              {isPro ? (
                <Badge className="cursor-pointer bg-[#1773cf] text-white hover:bg-[#1773cf]/90 text-[11px] px-2 py-0.5">
                  Pro
                </Badge>
              ) : (
                <Badge variant="secondary" className="cursor-pointer text-[11px] px-2 py-0.5">
                  Free
                </Badge>
              )}
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="transition-opacity hover:opacity-80"
                aria-label="Account menu"
              >
                <AvatarCircle url={avatarUrl} initials={initials} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{displayName}</p>
                {user?.emailAddresses[0]?.emailAddress && displayName !== user.emailAddresses[0].emailAddress && (
                  <p className="text-xs text-muted-foreground">{user.emailAddresses[0].emailAddress}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/pricing" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing & Plans
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
          className="lg:hidden rounded-sm p-1.5 text-muted-foreground hover:bg-muted"
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
        <div id="mobile-nav-menu" className="border-t border-border bg-background px-4 py-2 lg:hidden">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-sm px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[#eff6ff] text-[#1773cf] dark:bg-[#1773cf]/15"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
          {/* Mobile theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div className="mt-2 border-t border-border pt-2">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <AvatarCircle url={avatarUrl} initials={initials} />
              <span className="text-[12px] text-muted-foreground">{displayName}</span>
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
