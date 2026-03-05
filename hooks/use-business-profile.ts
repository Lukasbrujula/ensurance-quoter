"use client"

import { useState, useEffect, useCallback } from "react"
import type { FAQEntry } from "@/lib/types/database"

interface BusinessProfileData {
  businessName: string
  knowledgeBase: string
  faq: FAQEntry[]
}

const EMPTY: BusinessProfileData = {
  businessName: "",
  knowledgeBase: "",
  faq: [],
}

export function useBusinessProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<BusinessProfileData>(EMPTY)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/business-profile")
      if (!res.ok) return
      const data = await res.json() as BusinessProfileData
      setProfile({
        businessName: data.businessName ?? "",
        knowledgeBase: data.knowledgeBase ?? "",
        faq: Array.isArray(data.faq) ? data.faq : [],
      })
    } catch {
      // Use empty defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, profile, reload: load }
}
