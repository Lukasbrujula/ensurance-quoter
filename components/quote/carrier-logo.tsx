"use client"

import { getCarrierLogoUrl } from "@/lib/data/carrier-logos"

interface CarrierLogoProps {
  carrier: { id: string; abbr: string; color: string; name: string }
  /** Size variant: "sm" = inline table row, "md" = modal header */
  size?: "sm" | "md"
}

/**
 * Renders the carrier logo from Compulife CDN, falling back to a
 * colored abbreviation badge when no logo mapping exists.
 */
export function CarrierLogo({ carrier, size = "sm" }: CarrierLogoProps) {
  const logoUrl = getCarrierLogoUrl(carrier.id, "small")

  if (!logoUrl) {
    const boxClass =
      size === "md"
        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-xs font-bold text-white"
        : "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold text-white"
    return (
      <div className={boxClass} style={{ backgroundColor: carrier.color }}>
        {carrier.abbr}
      </div>
    )
  }

  const imgClass =
    size === "md"
      ? "h-10 w-auto max-w-[140px] object-contain"
      : "h-8 w-auto max-w-[120px] object-contain"

  const containerClass =
    size === "md"
      ? "flex h-10 w-[140px] shrink-0 items-center justify-start"
      : "flex h-8 w-[120px] shrink-0 items-center justify-start"

  return (
    <div className={containerClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={`${carrier.name} logo`}
        width={120}
        height={38}
        className={imgClass}
        loading="lazy"
      />
    </div>
  )
}
