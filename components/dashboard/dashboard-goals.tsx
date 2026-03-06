"use client"

import { useCallback, useEffect, useState } from "react"
import { Target, Plus, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Goal {
  readonly id: string
  readonly label: string
  readonly target: number
  readonly current: number
  readonly unit: string
}

interface GoalFormData {
  readonly label: string
  readonly target: string
  readonly current: string
  readonly unit: string
}

const STORAGE_KEY = "ensurance-dashboard-goals"

const EMPTY_FORM: GoalFormData = { label: "", target: "", current: "", unit: "$" }

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

function loadGoals(): readonly Goal[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Goal[]
  } catch {
    return []
  }
}

function saveGoals(goals: readonly Goal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardGoals() {
  const [goals, setGoals] = useState<readonly Goal[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<GoalFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setGoals(loadGoals())
  }, [])

  const persist = useCallback((next: readonly Goal[]) => {
    setGoals(next)
    saveGoals(next)
  }, [])

  /* -- Dialog handlers --------------------------------------------- */

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (goal: Goal) => {
    setEditingId(goal.id)
    setForm({
      label: goal.label,
      target: String(goal.target),
      current: String(goal.current),
      unit: goal.unit,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = () => {
    const label = form.label.trim()
    const target = Number(form.target)
    const current = Number(form.current)
    const unit = form.unit.trim()

    if (!label) {
      setFormError("Label is required")
      return
    }
    if (!Number.isFinite(target) || target <= 0) {
      setFormError("Target must be a positive number")
      return
    }
    if (!Number.isFinite(current) || current < 0) {
      setFormError("Current value must be zero or positive")
      return
    }
    if (!unit) {
      setFormError("Unit is required")
      return
    }

    if (editingId) {
      persist(
        goals.map((g) =>
          g.id === editingId ? { ...g, label, target, current, unit } : g
        )
      )
    } else {
      const newGoal: Goal = {
        id: crypto.randomUUID(),
        label,
        target,
        current,
        unit,
      }
      persist([...goals, newGoal])
    }

    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    persist(goals.filter((g) => g.id !== id))
  }

  const updateField = (field: keyof GoalFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFormError(null)
  }

  /* -- Render ------------------------------------------------------ */

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Target className="h-4 w-4 text-[#1773cf]" />
              Goals
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Target className="h-5 w-5 text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground">
                No goals yet — track commissions, calls, or policies sold.
              </p>
              <Button size="sm" variant="default" onClick={openAdd}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Your First Goal
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEdit(goal)}
                  onDelete={() => handleDelete(goal.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Goal" : "Add Goal"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update your goal details."
                : "Set a target to track your progress."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-label">Label</Label>
              <Input
                id="goal-label"
                placeholder="e.g. Commission this month"
                value={form.label}
                onChange={(e) => updateField("label", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-current">Current</Label>
                <Input
                  id="goal-current"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={form.current}
                  onChange={(e) => updateField("current", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target</Label>
                <Input
                  id="goal-target"
                  type="number"
                  min={1}
                  step="any"
                  placeholder="100"
                  value={form.target}
                  onChange={(e) => updateField("target", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-unit">Unit</Label>
              <Input
                id="goal-unit"
                placeholder="e.g. $, calls, policies"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
              />
            </div>

            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Goal card                                                          */
/* ------------------------------------------------------------------ */

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
}) {
  const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100)
  const isComplete = goal.current >= goal.target

  const formatted = (value: number, unit: string) => {
    if (unit === "$") return `$${value.toLocaleString()}`
    return `${value.toLocaleString()} ${unit}`
  }

  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-muted/30">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{goal.label}</p>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Edit ${goal.label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete ${goal.label}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Progress value={pct} className="mb-2 h-2" />

      <div className="flex items-baseline justify-between">
        <p className="text-[13px] text-muted-foreground">
          {formatted(goal.current, goal.unit)}{" "}
          <span className="text-muted-foreground/60">
            / {formatted(goal.target, goal.unit)}
          </span>
        </p>
        <span
          className={`text-xs font-semibold tabular-nums ${
            isComplete ? "text-green-600" : "text-muted-foreground"
          }`}
        >
          {pct}%
        </span>
      </div>
    </div>
  )
}
