"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, UserCircle } from "lucide-react"
import { DatePickerInput } from "@/components/leads/date-picker-input"
import { useLeadStore } from "@/lib/store/lead-store"
import { useOrgMembers } from "@/hooks/use-org-members"
import { createLead } from "@/lib/actions/leads"
import type { Lead } from "@/lib/types/lead"
import { toast } from "sonner"

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
  "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY","DC",
]

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "domestic_partner", label: "Domestic Partner" },
]

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  state: string
  dateOfBirth: string
  city: string
  zipCode: string
  maritalStatus: string
  occupation: string
}

const EMPTY_FORM: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  state: "",
  dateOfBirth: "",
  city: "",
  zipCode: "",
  maritalStatus: "",
  occupation: "",
}

export function AddLeadDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [assignee, setAssignee] = useState<string>("myself")
  const addLead = useLeadStore((s) => s.addLead)
  const { userId, orgId, orgRole } = useAuth()
  const { members } = useOrgMembers()

  const isOrgAdmin = Boolean(orgId && orgRole === "org:admin")

  function handleChange(field: keyof FormData, value: string) {
    setForm({ ...form, [field]: value })
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!form.firstName.trim() && !form.lastName.trim() && !form.email.trim()) {
      toast.error("Please enter at least a name or email")
      return
    }

    setIsSubmitting(true)

    try {
      const dobAge = form.dateOfBirth
        ? (() => {
            const date = new Date(form.dateOfBirth)
            if (isNaN(date.getTime())) return null
            const today = new Date()
            let age = today.getFullYear() - date.getFullYear()
            const md = today.getMonth() - date.getMonth()
            if (md < 0 || (md === 0 && today.getDate() < date.getDate())) age--
            return age >= 0 ? age : null
          })()
        : null

      const leadData = {
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        phone: form.phone.trim() || null,
        state: form.state || null,
        dateOfBirth: form.dateOfBirth || null,
        age: dobAge,
        city: form.city.trim() || null,
        zipCode: form.zipCode.trim() || null,
        maritalStatus: (form.maritalStatus || null) as Lead["maritalStatus"],
        occupation: form.occupation.trim() || null,
        source: "manual" as const,
      }

      // Build assignment options for org admins
      const options = isOrgAdmin && assignee !== "myself"
        ? { assigneeAgentId: assignee === "unassigned" ? null : assignee }
        : undefined

      const result = await createLead(leadData, options)

      if (result.success && result.data) {
        addLead(result.data)

        // Build toast message with assignee context
        if (isOrgAdmin && assignee === "unassigned") {
          toast.success("Lead added to lead pool")
        } else if (isOrgAdmin && assignee !== "myself") {
          const member = members[assignee]
          const name = member
            ? [member.firstName, member.lastName].filter(Boolean).join(" ")
            : "agent"
          toast.success(`Lead added and assigned to ${name}`)
        } else {
          toast.success("Lead added")
        }

        setForm(EMPTY_FORM)
        setAssignee("myself")
        setOpen(false)
      } else {
        toast.error(result.error ?? "Failed to add lead")
      }
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Build member list for the assignee dropdown
  const memberList = Object.entries(members)
    .filter(([id]) => id !== userId)
    .map(([id, m]) => ({
      id,
      name: [m.firstName, m.lastName].filter(Boolean).join(" ") || "Unknown",
      role: m.role,
    }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>
            Manually add a lead to your list.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select
              value={form.state}
              onValueChange={(v) => handleChange("state", v)}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <DatePickerInput
              id="dob"
              value={form.dateOfBirth || null}
              onChange={(val) => handleChange("dateOfBirth", val ?? "")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={form.zipCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d-]/g, "").slice(0, 10)
                  handleChange("zipCode", val)
                }}
                placeholder="12345"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maritalStatus">Marital Status</Label>
            <Select
              value={form.maritalStatus}
              onValueChange={(v) => handleChange("maritalStatus", v)}
            >
              <SelectTrigger id="maritalStatus">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {MARITAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={form.occupation}
              onChange={(e) => handleChange("occupation", e.target.value)}
              placeholder="Job title"
            />
          </div>

          {isOrgAdmin && (
            <div className="space-y-2">
              <Label htmlFor="assignee">Assign to</Label>
              <Select
                value={assignee}
                onValueChange={setAssignee}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="myself">
                    <span className="flex items-center gap-1.5">
                      <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      Myself
                    </span>
                  </SelectItem>
                  {memberList.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <span className="flex items-center gap-1.5">
                        <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        {member.name}
                        {member.role === "org:admin" && (
                          <span className="text-[10px] text-muted-foreground">(Admin)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">Unassigned (Lead Pool)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
