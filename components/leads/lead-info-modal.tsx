"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Zap,
  MessageSquare,
  Phone,
  Trash2,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadStatusBadge, LEAD_STATUSES, getStatusLabel } from "./lead-status-badge"
import { updateLeadFields } from "@/lib/actions/leads"
import { removeLeadAction } from "@/lib/actions/leads"
import { useLeadStore } from "@/lib/store/lead-store"
import { US_STATES } from "@/lib/data/us-states"
import type { Lead, LeadStatus } from "@/lib/types/lead"
import type { Gender, TobaccoStatus } from "@/lib/types/quote"

/* ------------------------------------------------------------------ */
/*  Lead Info Modal — right-side sheet for quick lead editing            */
/* ------------------------------------------------------------------ */

interface LeadInfoModalProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  state: string
  age: string
  gender: string
  dateOfBirth: string
  maritalStatus: string
  coverageAmount: string
  termLength: string
  tobaccoStatus: string
  duiHistory: boolean
  status: LeadStatus
}

function leadToForm(lead: Lead): FormData {
  return {
    firstName: lead.firstName ?? "",
    lastName: lead.lastName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    state: lead.state ?? "",
    age: lead.age?.toString() ?? "",
    gender: lead.gender ?? "",
    dateOfBirth: lead.dateOfBirth ?? "",
    maritalStatus: lead.maritalStatus ?? "",
    coverageAmount: lead.coverageAmount?.toString() ?? "",
    termLength: lead.termLength?.toString() ?? "",
    tobaccoStatus: lead.tobaccoStatus ?? "",
    duiHistory: lead.duiHistory,
    status: lead.status,
  }
}

export function LeadInfoModal({ lead, open, onOpenChange }: LeadInfoModalProps) {
  const router = useRouter()
  const removeLead = useLeadStore((s) => s.removeLead)
  const hydrateLeads = useLeadStore((s) => s.hydrateLeads)
  const setActiveLead = useLeadStore((s) => s.setActiveLead)

  const [formData, setFormData] = useState<FormData>(() =>
    lead ? leadToForm(lead) : leadToForm({} as Lead),
  )
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      setFormData(leadToForm(lead))
      setDirtyFields(new Set())
    }
  }, [lead])

  const updateField = useCallback((field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setDirtyFields((prev) => new Set([...prev, field]))
  }, [])

  const hasDirtyFields = dirtyFields.size > 0

  const handleSave = useCallback(async () => {
    if (!lead || !hasDirtyFields) return
    setIsSaving(true)

    const changes: Partial<Lead> = {}
    for (const field of dirtyFields) {
      switch (field) {
        case "firstName":
          changes.firstName = formData.firstName || null
          break
        case "lastName":
          changes.lastName = formData.lastName || null
          break
        case "email":
          changes.email = formData.email || null
          break
        case "phone":
          changes.phone = formData.phone || null
          break
        case "state":
          changes.state = formData.state || null
          break
        case "age":
          changes.age = formData.age ? parseInt(formData.age, 10) : null
          break
        case "gender":
          changes.gender = (formData.gender || null) as Gender | null
          break
        case "dateOfBirth":
          changes.dateOfBirth = formData.dateOfBirth || null
          break
        case "maritalStatus":
          changes.maritalStatus = (formData.maritalStatus || null) as Lead["maritalStatus"]
          break
        case "coverageAmount":
          changes.coverageAmount = formData.coverageAmount ? parseInt(formData.coverageAmount, 10) : null
          break
        case "termLength":
          changes.termLength = formData.termLength ? parseInt(formData.termLength, 10) : null
          break
        case "tobaccoStatus":
          changes.tobaccoStatus = (formData.tobaccoStatus || null) as TobaccoStatus | null
          break
        case "duiHistory":
          changes.duiHistory = formData.duiHistory
          break
        case "status":
          changes.status = formData.status
          changes.statusUpdatedAt = new Date().toISOString()
          break
      }
    }

    // Optimistic store update
    useLeadStore.setState((s) => ({
      leads: s.leads.map((l) =>
        l.id === lead.id ? { ...l, ...changes } : l,
      ),
    }))

    const result = await updateLeadFields(lead.id, changes)
    setIsSaving(false)

    if (result.success) {
      toast.success("Lead updated")
      setDirtyFields(new Set())
      onOpenChange(false)
    } else {
      toast.error("Failed to save")
      void hydrateLeads()
    }
  }, [lead, hasDirtyFields, formData, dirtyFields, onOpenChange, hydrateLeads])

  const handleDelete = useCallback(async () => {
    if (!lead) return
    const result = await removeLeadAction(lead.id)
    if (result.success) {
      removeLead(lead.id)
      toast.success("Lead deleted")
      setDeleteOpen(false)
      onOpenChange(false)
    } else {
      toast.error(result.error ?? "Failed to delete")
    }
  }, [lead, removeLead, onOpenChange])

  const handleOpenQuote = useCallback(() => {
    if (!lead) return
    setActiveLead(lead)
    router.push(`/leads/${lead.id}`)
  }, [lead, setActiveLead, router])

  const handleOpenSms = useCallback(() => {
    if (!lead) return
    setActiveLead(lead)
    router.push(`/leads/${lead.id}?tab=sms`)
  }, [lead, setActiveLead, router])

  if (!lead) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[460px] overflow-y-auto p-0 sm:max-w-[460px]">
          <SheetHeader className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <SheetTitle className="flex-1 truncate text-[15px]">
                {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed Lead"}
              </SheetTitle>
              <LeadStatusBadge status={lead.status} />
            </div>
          </SheetHeader>

          {/* Action buttons */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Button size="sm" variant="default" className="gap-1.5 text-[11px]" onClick={handleOpenQuote}>
              <Zap className="h-3.5 w-3.5" />
              Open Quote
            </Button>
            {lead.phone && (
              <Button size="sm" variant="outline" className="gap-1.5 text-[11px]" onClick={handleOpenSms}>
                <MessageSquare className="h-3.5 w-3.5" />
                Text
              </Button>
            )}
            {lead.phone && (
              <Button size="sm" variant="outline" className="gap-1.5 text-[11px]" onClick={handleOpenQuote}>
                <Phone className="h-3.5 w-3.5" />
                Call
              </Button>
            )}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>

          {/* Form sections */}
          <div className="space-y-5 px-4 py-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Status
              </Label>
              <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Contact
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">First Name</Label>
                  <Input className="h-8 text-[12px]" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Last Name</Label>
                  <Input className="h-8 text-[12px]" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Email</Label>
                <Input className="h-8 text-[12px]" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Phone</Label>
                <Input className="h-8 text-[12px]" type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Details
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">State</Label>
                  <Select value={formData.state || "__none__"} onValueChange={(v) => updateField("state", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {US_STATES.map((st) => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Age</Label>
                  <Input className="h-8 text-[12px]" type="number" min={0} max={100} value={formData.age} onChange={(e) => updateField("age", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Gender</Label>
                  <Select value={formData.gender || "__none__"} onValueChange={(v) => updateField("gender", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Date of Birth</Label>
                  <Input className="h-8 text-[12px]" type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Insurance
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Coverage ($)</Label>
                  <Input className="h-8 text-[12px]" type="number" value={formData.coverageAmount} onChange={(e) => updateField("coverageAmount", e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Term (years)</Label>
                  <Select value={formData.termLength || "__none__"} onValueChange={(v) => updateField("termLength", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Tobacco</Label>
                  <Select value={formData.tobaccoStatus || "__none__"} onValueChange={(v) => updateField("tobaccoStatus", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="cigarette">Cigarette</SelectItem>
                      <SelectItem value="cigar">Cigar</SelectItem>
                      <SelectItem value="vape">Vape</SelectItem>
                      <SelectItem value="chew">Chew</SelectItem>
                      <SelectItem value="marijuana">Marijuana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={formData.duiHistory}
                      onChange={(e) => updateField("duiHistory", e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    DUI History
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save bar */}
          {hasDirtyFields && (
            <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
              <Button
                className="w-full gap-1.5"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "this lead"}</strong>{" "}
              and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
