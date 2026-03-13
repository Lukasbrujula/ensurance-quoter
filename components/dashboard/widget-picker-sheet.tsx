"use client"

import { RotateCcw } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DASHBOARD_WIDGETS,
  WIDGET_CATEGORIES,
  CATEGORY_ORDER,
  type WidgetCategory,
  type WidgetDefinition,
} from "@/lib/data/dashboard-widgets"

interface WidgetPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeWidgetIds: readonly string[]
  onToggle: (widgetId: string) => void
  onReset: () => void
}

export function WidgetPickerSheet({
  open,
  onOpenChange,
  activeWidgetIds,
  onToggle,
  onReset,
}: WidgetPickerSheetProps) {
  const activeSet = new Set(activeWidgetIds)

  const widgetsByCategory = new Map<WidgetCategory, WidgetDefinition[]>()
  for (const widget of DASHBOARD_WIDGETS) {
    const list = widgetsByCategory.get(widget.category) ?? []
    list.push(widget)
    widgetsByCategory.set(widget.category, list)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Choose which widgets to show on your dashboard. Drag to reorder after closing.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-muted-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to Default
          </Button>
        </div>

        <ScrollArea className="mt-2 h-[calc(100vh-200px)]">
          <div className="space-y-6 pb-8 pr-4">
            {CATEGORY_ORDER.map((category) => {
              const widgets = widgetsByCategory.get(category)
              if (!widgets || widgets.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {WIDGET_CATEGORIES[category]}
                  </h3>
                  <div className="space-y-1">
                    {widgets.map((widget) => (
                      <label
                        key={widget.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-sm font-medium">{widget.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {widget.description}
                          </p>
                        </div>
                        <Switch
                          checked={activeSet.has(widget.id)}
                          onCheckedChange={() => onToggle(widget.id)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
