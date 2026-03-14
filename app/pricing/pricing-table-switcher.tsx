"use client"

import { useSearchParams } from "next/navigation"
import { PricingTable } from "@clerk/nextjs"

export function PricingTableSwitcher() {
  const searchParams = useSearchParams()
  const target = searchParams.get("for")

  if (target === "organization") {
    return <PricingTable for="organization" />
  }

  return <PricingTable />
}
