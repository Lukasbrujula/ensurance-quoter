"use client"

import { useState, useEffect, useCallback, useRef } from "react"

const DEFAULT_WIDGET_ORDER: string[] = [
  "stats",
  "business-profile",
  "pipeline",
  "charts",
  "goals",
  "activity-followups",
]

export type WidgetId = "stats" | "business-profile" | "pipeline" | "charts" | "goals" | "activity-followups"

const DEBOUNCE_MS = 1500

export function useDashboardLayout() {
  const [widgetOrder, setWidgetOrder] = useState<string[]>([...DEFAULT_WIDGET_ORDER])
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/dashboard-layout")
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.layout) && data.layout.length > 0) {
          const saved = data.layout as string[]
          const defaults = [...DEFAULT_WIDGET_ORDER]
          const missing = defaults.filter((id) => !saved.includes(id))
          const valid = saved.filter((id) => defaults.includes(id))
          setWidgetOrder([...valid, ...missing])
        }
      } catch {
        // use default order
      } finally {
        setLoaded(true)
      }
    }
    void load()
  }, [])

  const persistLayout = useCallback((order: string[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/settings/dashboard-layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: order }),
        })
      } catch {
        // silent fail — layout will reload from default next time
      }
    }, DEBOUNCE_MS)
  }, [])

  const reorder = useCallback(
    (newOrder: string[]) => {
      setWidgetOrder(newOrder)
      persistLayout(newOrder)
    },
    [persistLayout],
  )

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  return { widgetOrder, reorder, loaded }
}
