"use client"

import { useEffect, useState, useCallback } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/auth/auth-provider"
import { SettingsPageHeader } from "./settings-page-header"
import { US_STATES } from "@/lib/data/us-states"

/* ── Types ──────────────────────────────────────────────────────────── */

interface License {
  id: string
  state: string
  license_number: string
  license_type: string
  issue_date: string | null
  expiration_date: string | null
  status: string
}

const LICENSE_TYPES = [
  "Life & Health",
  "Life Only",
  "Health Only",
  "Property & Casualty",
  "Other",
] as const

/* ── Status helpers ────────────────────────────────────────────────── */

type LicenseStatus = "active" | "expiring" | "expired"

function computeStatus(expirationDate: string | null): LicenseStatus {
  if (!expirationDate) return "active"
  const expiry = new Date(expirationDate)
  const now = new Date()
  const daysUntil = Math.floor(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (daysUntil < 0) return "expired"
  if (daysUntil <= 30) return "expiring"
  return "active"
}

function StatusBadge({ status }: { status: LicenseStatus }) {
  switch (status) {
    case "active":
      return (
        <Badge variant="secondary" className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      )
    case "expiring":
      return (
        <Badge variant="secondary" className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          Expiring
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="secondary" className="gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      )
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "2-digit",
    year: "2-digit",
  })
}

/* ── Form Schema ───────────────────────────────────────────────────── */

const licenseSchema = z.object({
  state: z.string().min(1, "State is required"),
  license_number: z.string().min(1, "License number is required"),
  license_type: z.string().min(1, "License type is required"),
  issue_date: z.string().optional(),
  expiration_date: z.string().optional(),
})

type LicenseFormValues = z.infer<typeof licenseSchema>

/* ── Loading skeleton ──────────────────────────────────────────────── */

function LicensesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-1 h-5 w-80" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}

/* ── Main Component ────────────────────────────────────────────────── */

export function LicensesSettingsClient() {
  const { user, loading: authLoading } = useAuth()
  const [licenses, setLicenses] = useState<License[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLicense, setEditingLicense] = useState<License | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null)

  const form = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      state: "",
      license_number: "",
      license_type: "Life & Health",
      issue_date: "",
      expiration_date: "",
    },
  })

  const fetchLicenses = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/licenses")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = (await res.json()) as { licenses: License[] }
      setLicenses(data.licenses)
    } catch {
      toast.error("Failed to load licenses")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchLicenses()
  }, [user, fetchLicenses])

  function openAddDialog() {
    setEditingLicense(null)
    form.reset({
      state: "",
      license_number: "",
      license_type: "Life & Health",
      issue_date: "",
      expiration_date: "",
    })
    setDialogOpen(true)
  }

  function openEditDialog(license: License) {
    setEditingLicense(license)
    form.reset({
      state: license.state,
      license_number: license.license_number,
      license_type: license.license_type,
      issue_date: license.issue_date ?? "",
      expiration_date: license.expiration_date ?? "",
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: LicenseFormValues) {
    setIsSaving(true)
    try {
      if (editingLicense) {
        const res = await fetch("/api/settings/licenses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingLicense.id,
            state: values.state,
            license_number: values.license_number,
            license_type: values.license_type,
            issue_date: values.issue_date || null,
            expiration_date: values.expiration_date || null,
          }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error ?? "Failed to update")
        }
        toast.success("License updated")
      } else {
        const res = await fetch("/api/settings/licenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: values.state,
            license_number: values.license_number,
            license_type: values.license_type,
            issue_date: values.issue_date || null,
            expiration_date: values.expiration_date || null,
          }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error ?? "Failed to add")
        }
        toast.success("License added")
      }
      setDialogOpen(false)
      await fetchLicenses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save license")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch("/api/settings/licenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("License removed")
      setDeleteTarget(null)
      await fetchLicenses()
    } catch {
      toast.error("Failed to delete license")
    }
  }

  if (authLoading || isLoading) return <LicensesSkeleton />

  const licensesWithStatus = licenses.map((l) => ({
    ...l,
    computedStatus: computeStatus(l.expiration_date),
  }))

  const expiringCount = licensesWithStatus.filter(
    (l) => l.computedStatus === "expiring",
  ).length
  const expiredCount = licensesWithStatus.filter(
    (l) => l.computedStatus === "expired",
  ).length

  return (
    <div>
      <SettingsPageHeader
        title="Licenses"
        description="Manage your state insurance licenses."
      />

      {/* Alerts */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <div className="mb-4 space-y-2">
          {expiringCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {expiringCount} license{expiringCount > 1 ? "s" : ""} expiring
              within 30 days
            </div>
          )}
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <XCircle className="h-4 w-4 shrink-0" />
              {expiredCount} license{expiredCount > 1 ? "s" : ""} expired
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">State Licenses</CardTitle>
            <CardDescription>
              {licenses.length === 0
                ? "No licenses added yet."
                : `${licenses.length} license${licenses.length > 1 ? "s" : ""} on file.`}
            </CardDescription>
          </div>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add License
          </Button>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <p>Track your state licenses and get expiration alerts.</p>
              <Button variant="outline" size="sm" onClick={openAddDialog}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add your first license
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-left">
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      State
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      License #
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Expires
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {licensesWithStatus.map((license) => (
                    <tr
                      key={license.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium">{license.state}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {license.license_number}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {license.license_type}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatDate(license.expiration_date)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={license.computedStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditDialog(license)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(license)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLicense ? "Edit License" : "Add License"}
            </DialogTitle>
            <DialogDescription>
              {editingLicense
                ? "Update your license information."
                : "Add a new state insurance license."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="license_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LICENSE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="license_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="issue_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiration_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {editingLicense ? "Save Changes" : "Add License"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete License</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the {deleteTarget?.state} {deleteTarget?.license_type}{" "}
              license? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
