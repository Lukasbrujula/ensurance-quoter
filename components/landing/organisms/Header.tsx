"use client";

import { useState } from "react";
import { Logo } from "@/components/landing/atoms/Logo";
import { NavLink } from "@/components/landing/atoms/NavLink";
import { MaterialIcon } from "@/components/landing/atoms/MaterialIcon";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#security", label: "Security" },
  { href: "#carriers", label: "Carriers" },
  { href: "/pricing", label: "Pricing" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo />

          {/* Desktop Nav */}
          <nav
            className="hidden md:flex items-center gap-8"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <NavLink key={link.label} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                size="sm"
                className="font-semibold text-slate-900"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button
                size="sm"
                className="bg-brand text-white font-bold rounded hover:bg-brand/90 shadow-[0px_10px_15px_-3px_rgba(23,115,207,0.2),0px_4px_6px_-4px_rgba(23,115,207,0.2)]"
              >
                Request Access
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <MaterialIcon
              name={mobileMenuOpen ? "close" : "menu"}
              size="md"
              className="text-slate-900"
            />
          </button>
        </div>

        {/* Mobile Nav */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-96 pb-6" : "max-h-0",
          )}
        >
          <nav
            className="flex flex-col gap-4 pt-4"
            aria-label="Mobile navigation"
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.label}
                href={link.href}
                className="text-base py-2"
              >
                {link.label}
              </NavLink>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="ghost"
                className="w-full justify-center font-semibold text-slate-900"
              >
                Sign In
              </Button>
              <Button className="w-full bg-brand text-white font-bold rounded hover:bg-brand/90">
                Request Access
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
