"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { DEFAULT_ACTIVE_WIDGET_IDS, ALL_WIDGET_IDS } from "@/lib/data/dashboard-widgets"

export interface DashboardLayout {
  readonly active: string[]
  readonly hidden: string[]
}

const DEBOUNCE_MS = 1500

function buildDefaultLayout(): DashboardLayout {
  const activeSet = new Set(DEFAULT_ACTIVE_WIDGET_IDS)
  return {
    active: [...DEFAULT_ACTIVE_WIDGET_IDS],
    hidden: ALL_WIDGET_IDS.filter((id) => !activeSet.has(id)),
  }
}

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(buildDefaultLayout)
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/dashboard-layout")
        if (!res.ok) return
        const data = await res.json()
        if (data.layout && Array.isArray(data.layout.active)) {
          setLayout({
            active: data.layout.active as string[],
            hidden: data.layout.hidden as string[],
          })
        }
      } catch {
        // use default layout
      } finally {
        setLoaded(true)
      }
    }
    void load()
  }, [])

  const persistLayout = useCallback((next: DashboardLayout) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/settings/dashboard-layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        })
      } catch {
        // silent fail
      }
    }, DEBOUNCE_MS)
  }, [])

  /** Reorder the active widgets (drag-and-drop) */
  const reorder = useCallback(
    (newActiveOrder: string[]) => {
      const next: DashboardLayout = { ...layout, active: newActiveOrder }
      setLayout(next)
      persistLayout(next)
    },
    [layout, persistLayout],
  )

  /** Toggle a widget between active and hidden */
  const toggleWidget = useCallback(
    (widgetId: string) => {
      const isActive = layout.active.includes(widgetId)
      const next: DashboardLayout = isActive
        ? {
            active: layout.active.filter((id) => id !== widgetId),
            hidden: [...layout.hidden, widgetId],
          }
        : {
            active: [...layout.active, widgetId],
            hidden: layout.hidden.filter((id) => id !== widgetId),
          }
      setLayout(next)
      persistLayout(next)
    },
    [layout, persistLayout],
  )

  /** Reset to default layout */
  const resetToDefault = useCallback(() => {
    const next = buildDefaultLayout()
    setLayout(next)
    persistLayout(next)
  }, [persistLayout])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // Backward compat: expose widgetOrder as alias for active
  return {
    layout,
    widgetOrder: layout.active,
    reorder,
    toggleWidget,
    resetToDefault,
    loaded,
  }
}
