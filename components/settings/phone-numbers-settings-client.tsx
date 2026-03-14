"use client"

import { useEffect, useState, useCallback } from "react"
import { z } from "zod"
import {
  Loader2,
  Phone,
  Trash2,
  Search,
  ShoppingCart,
  Star,
  AlertTriangle,
  ChevronsUpDown,
  Check,
  ShieldCheck,
  Clock,
  ShieldX,
  ChevronDown,
  FileCheck,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@clerk/nextjs"
import { SettingsPageHeader } from "./settings-page-header"
import { formatPhoneDisplay } from "@/lib/utils/phone"
import { US_STATE_OPTIONS } from "@/lib/data/us-states"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NumberType = "local" | "toll_free"
type VerificationStatus = "pending" | "verified" | "rejected" | "unknown"

interface PhoneNumber {
  id: string
  phoneNumber: string
  isPrimary: boolean
  label: string | null
  numberType: NumberType
  smsEnabled: boolean
  voiceEnabled: boolean
  createdAt: string
  verificationStatus?: VerificationStatus
}

interface AvailableNumber {
  phoneNumber: string
  city: string | null
  state: string | null
  monthlyRate: string
  numberType?: NumberType
}

const searchSchema = z.object({
  state: z.string().optional(),
  areaCode: z.string().max(6).optional(),
})

const TOLL_FREE_PREFIXES = [
  { value: "all", label: "Any prefix" },
  { value: "800", label: "800" },
  { value: "888", label: "888" },
  { value: "877", label: "877" },
  { value: "866", label: "866" },
  { value: "855", label: "855" },
  { value: "844", label: "844" },
  { value: "833", label: "833" },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function VerificationBadge({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "verified":
      return (
        <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">
          <ShieldCheck className="h-3 w-3" />
          Verified
        </Badge>
      )
    case "pending":
      return (
        <Badge className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-[10px]">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="gap-1 bg-red-100 text-red-800 hover:bg-red-100 text-[10px]">
          <ShieldX className="h-3 w-3" />
          Rejected
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-[10px]">
          Unknown
        </Badge>
      )
  }
}

/* ------------------------------------------------------------------ */
/*  Toll-Free Verification Form                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_USE_CASE =
  "Client follow-ups, appointment reminders, and insurance quote notifications"
const DEFAULT_SAMPLE_MESSAGE =
  "Hi [Client Name], this is [Agent Name]. Following up on the life insurance quote we discussed. When is a good time to review your options? Reply STOP to opt out."
const DEFAULT_OPT_IN =
  "Clients provide their phone number during the insurance intake process. The agent confirms SMS consent before sending messages."

const einSchema = z
  .string()
  .min(1, "EIN is required")
  .regex(/^\d{2}-?\d{7}$/, "EIN must be in XX-XXXXXXX format")

interface VerificationFormProps {
  phoneNumberId: string
  onSuccess: () => void
}

function TollFreeVerificationForm({
  phoneNumberId,
  onSuccess,
}: VerificationFormProps) {
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [businessName, setBusinessName] = useState("")
  const [businessEin, setBusinessEin] = useState("")
  const [businessWebsite, setBusinessWebsite] = useState("")
  const [useCase, setUseCase] = useState(DEFAULT_USE_CASE)
  const [sampleMessage, setSampleMessage] = useState(DEFAULT_SAMPLE_MESSAGE)
  const [optInDescription, setOptInDescription] = useState(DEFAULT_OPT_IN)
  const [einError, setEinError] = useState("")

  const handleEinChange = (value: string) => {
    // Auto-format as XX-XXXXXXX
    const digits = value.replace(/\D/g, "").slice(0, 9)
    const formatted =
      digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits
    setBusinessEin(formatted)
    setEinError("")
  }

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      toast.error("Business name is required")
      return
    }

    const einResult = einSchema.safeParse(businessEin)
    if (!einResult.success) {
      setEinError(einResult.error.issues[0]?.message ?? "Invalid EIN")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/phone-numbers/verify-toll-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId,
          businessName: businessName.trim(),
          businessEin: businessEin.trim(),
          businessWebsite: businessWebsite.trim() || "",
          useCase: useCase.trim(),
          sampleMessage: sampleMessage.trim(),
          optInDescription: optInDescription.trim(),
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(
          data?.error ?? "Verification submission failed. Please try again.",
        )
      }

      toast.success(
        "Verification submitted — this typically takes 2-3 business days",
      )
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Verification submission failed. Please try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 rounded-md border border-border">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
          Verify for SMS
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <p className="text-[12px] text-muted-foreground">
            Submit your business details to verify this toll-free number for SMS
            messaging. Verification typically takes 2-3 business days.
          </p>

          {/* Business Name */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-business-name" className="text-[12px]">
              Business Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vf-business-name"
              className="h-9 text-[13px]"
              placeholder="Your agency or business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          {/* EIN */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-ein" className="text-[12px]">
              EIN / Tax ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vf-ein"
              className={cn(
                "h-9 text-[13px] font-mono",
                einError && "border-red-500",
              )}
              placeholder="XX-XXXXXXX"
              value={businessEin}
              onChange={(e) => handleEinChange(e.target.value)}
              maxLength={10}
            />
            {einError && (
              <p className="text-[11px] text-red-500">{einError}</p>
            )}
          </div>

          {/* Business Website (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-website" className="text-[12px]">
              Business Website{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="vf-website"
              className="h-9 text-[13px]"
              placeholder="https://youragency.com"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
            />
          </div>

          {/* Use Case */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-use-case" className="text-[12px]">
              Use Case
            </Label>
            <Textarea
              id="vf-use-case"
              className="min-h-[60px] text-[13px] resize-none"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
            />
          </div>

          {/* Sample Message */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-sample" className="text-[12px]">
              Sample Message
            </Label>
            <Textarea
              id="vf-sample"
              className="min-h-[60px] text-[13px] resize-none"
              value={sampleMessage}
              onChange={(e) => setSampleMessage(e.target.value)}
            />
          </div>

          {/* Opt-In Description */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-opt-in" className="text-[12px]">
              Opt-In Description
            </Label>
            <Textarea
              id="vf-opt-in"
              className="min-h-[60px] text-[13px] resize-none"
              value={optInDescription}
              onChange={(e) => setOptInDescription(e.target.value)}
            />
          </div>

          <Button
            size="sm"
            className="gap-1.5 cursor-pointer"
            disabled={submitting || !businessName.trim() || !businessEin.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileCheck className="h-3.5 w-3.5" />
            )}
            Submit Verification
          </Button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PhoneNumbersSettingsClient() {
  const { orgId, orgRole } = useAuth()
  const canManageNumbers = !orgId || orgRole === "org:admin"
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchState, setSearchState] = useState("")
  const [stateOpen, setStateOpen] = useState(false)
  const [searchAreaCode, setSearchAreaCode] = useState("")
  const [searchResults, setSearchResults] = useState<AvailableNumber[]>([])
  const [searching, setSearching] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [releaseTarget, setReleaseTarget] = useState<PhoneNumber | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [searchNumberType, setSearchNumberType] = useState<NumberType>("local")
  const [tollFreePrefix, setTollFreePrefix] = useState("all")

  const loadNumbers = useCallback(async () => {
    try {
      const res = await fetch("/api/phone-numbers")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { numbers: PhoneNumber[] }
      setNumbers(data.numbers)

      // Fetch verification status for toll-free numbers
      const tollFreeNumbers = data.numbers.filter((n) => n.numberType === "toll_free")
      if (tollFreeNumbers.length > 0) {
        const statusRes = await fetch("/api/phone-numbers/verification-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumbers: tollFreeNumbers.map((n) => n.phoneNumber),
          }),
        })
        if (statusRes.ok) {
          const statusData = (await statusRes.json()) as {
            statuses: Record<string, VerificationStatus>
          }
          setNumbers((prev) =>
            prev.map((n) => ({
              ...n,
              verificationStatus: statusData.statuses[n.phoneNumber] ?? n.verificationStatus,
            })),
          )
        }
      }
    } catch {
      toast.error("Failed to load phone numbers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNumbers()
  }, [loadNumbers])

  const handleSearch = useCallback(async () => {
    if (searchNumberType === "local") {
      const parsed = searchSchema.safeParse({
        state: searchState || undefined,
        areaCode: searchAreaCode || undefined,
      })
      if (!parsed.success) return
    }

    setSearching(true)
    setSearchResults([])

    try {
      const body: Record<string, unknown> = { numberType: searchNumberType }
      if (searchNumberType === "toll_free") {
        if (tollFreePrefix && tollFreePrefix !== "all") body.tollFreePrefix = tollFreePrefix
      } else {
        if (searchState) body.state = searchState
        if (searchAreaCode) body.areaCode = searchAreaCode
      }

      const res = await fetch("/api/phone-numbers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Search failed")
      const data = (await res.json()) as { numbers: AvailableNumber[] }
      setSearchResults(data.numbers)
      if (data.numbers.length === 0) {
        toast.info("No numbers available for that search")
      }
    } catch {
      toast.error("Failed to search numbers")
    } finally {
      setSearching(false)
    }
  }, [searchState, searchAreaCode, searchNumberType, tollFreePrefix])

  const handlePurchase = useCallback(async (phoneNumber: string) => {
    setPurchasing(phoneNumber)
    try {
      const res = await fetch("/api/phone-numbers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, numberType: searchNumberType }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "Purchase failed")
      }
      toast.success("Phone number purchased")
      setSearchResults((prev) => prev.filter((n) => n.phoneNumber !== phoneNumber))
      await loadNumbers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purchase failed")
    } finally {
      setPurchasing(null)
    }
  }, [loadNumbers, searchNumberType])

  const handleSetPrimary = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/phone-numbers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      })
      if (!res.ok) throw new Error("Update failed")
      toast.success("Primary number updated")
      await loadNumbers()
    } catch {
      toast.error("Failed to update primary number")
    }
  }, [loadNumbers])

  const handleRelease = useCallback(async () => {
    if (!releaseTarget) return
    setReleasing(true)
    try {
      const res = await fetch(`/api/phone-numbers/${releaseTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Phone number released")
      setReleaseTarget(null)
      await loadNumbers()
    } catch {
      toast.error("Failed to release number")
    } finally {
      setReleasing(false)
    }
  }, [releaseTarget, loadNumbers])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasTollFree = numbers.some((n) => n.numberType === "toll_free")
  const hasUnverifiedTollFree = numbers.some(
    (n) => n.numberType === "toll_free" && n.verificationStatus !== "verified",
  )

  return (
    <div>
      <SettingsPageHeader
        title="Phone Numbers"
        description="Purchase and manage phone numbers for SMS messaging."
      />

      {/* Unverified toll-free warning */}
      {hasTollFree && hasUnverifiedTollFree && (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-900/50 dark:bg-yellow-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div className="text-[13px]">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Toll-free number pending verification
            </p>
            <p className="mt-0.5 text-yellow-700 dark:text-yellow-300/80">
              SMS messages may be blocked by carriers until toll-free verification is complete.
              Use the verification form below to submit your business details.
            </p>
          </div>
        </div>
      )}

      {/* Your Numbers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Phone className="h-4 w-4" />
            Your Numbers
          </CardTitle>
          <CardDescription>
            Phone numbers you own. Toll-free numbers are preferred for outbound SMS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {numbers.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
              <Phone className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-[13px] font-medium text-muted-foreground">
                No phone numbers yet
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Search and purchase a number below to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>SMS</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((num) => (
                  <TableRow key={num.id}>
                    <TableCell className="font-mono text-[13px]">
                      {formatPhoneDisplay(num.phoneNumber)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={num.numberType === "toll_free" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {num.numberType === "toll_free" ? "Toll-Free" : "Local"}
                        </Badge>
                        {num.numberType === "toll_free" && num.verificationStatus && (
                          <VerificationBadge status={num.verificationStatus} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {num.label ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={num.smsEnabled ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {num.smsEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {num.isPrimary ? (
                        <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                          <Star className="h-3 w-3 fill-amber-500" />
                          Primary
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-muted-foreground cursor-pointer"
                          onClick={() => void handleSetPrimary(num.id)}
                        >
                          Set Primary
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600 cursor-pointer"
                        onClick={() => setReleaseTarget(num)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Verification forms for unverified toll-free numbers */}
          {numbers
            .filter(
              (n) =>
                n.numberType === "toll_free" &&
                n.verificationStatus !== "verified" &&
                n.verificationStatus !== "pending",
            )
            .map((n) => (
              <div key={`verify-${n.id}`} className="mt-2">
                <p className="mb-1 text-[11px] text-muted-foreground">
                  {formatPhoneDisplay(n.phoneNumber)}
                </p>
                <TollFreeVerificationForm
                  phoneNumberId={n.id}
                  onSuccess={() => void loadNumbers()}
                />
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Get a Number — admin only in team mode */}
      {!canManageNumbers ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-sm text-muted-foreground">
              Phone number purchases are managed by your team admin.
            </p>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <ShoppingCart className="h-4 w-4" />
            Get a Number
          </CardTitle>
          <CardDescription>
            Search for available phone numbers. Toll-free numbers are recommended for SMS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            {/* Number type selector */}
            <div className="w-40">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Number Type
              </label>
              <Select
                value={searchNumberType}
                onValueChange={(v) => {
                  setSearchNumberType(v as NumberType)
                  setSearchResults([])
                }}
              >
                <SelectTrigger className="h-9 text-[13px] cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local" className="cursor-pointer">Local</SelectItem>
                  <SelectItem value="toll_free" className="cursor-pointer">Toll-Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchNumberType === "local" ? (
              <>
                <div className="w-48">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    State
                  </label>
                  <Popover open={stateOpen} onOpenChange={setStateOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-[13px] cursor-pointer hover:bg-accent"
                      >
                        {searchState ? (
                          <span>
                            {searchState} — {US_STATE_OPTIONS.find((s) => s.value === searchState)?.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Search state...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0" align="start">
                      <Command
                        filter={(itemValue, search) => {
                          const state = US_STATE_OPTIONS.find((s) => s.value === itemValue)
                          if (!state) return 0
                          const term = search.toLowerCase()
                          if (state.value.toLowerCase().startsWith(term)) return 1
                          if (state.label.toLowerCase().includes(term)) return 1
                          return 0
                        }}
                      >
                        <CommandInput placeholder="Search states..." className="text-[13px]" />
                        <CommandList>
                          <CommandEmpty className="py-3 text-center text-[12px] text-muted-foreground">
                            No states found.
                          </CommandEmpty>
                          <CommandGroup>
                            {US_STATE_OPTIONS.map((state) => (
                              <CommandItem
                                key={state.value}
                                value={state.value}
                                onSelect={(selectedValue) => {
                                  setSearchState(selectedValue.toUpperCase())
                                  setStateOpen(false)
                                }}
                                className="text-[13px]"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3.5 w-3.5",
                                    searchState === state.value ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {state.value} — {state.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-36">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Area Code
                  </label>
                  <Input
                    className="h-9 text-[13px]"
                    placeholder="e.g. 415"
                    maxLength={6}
                    value={searchAreaCode}
                    onChange={(e) => setSearchAreaCode(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="w-40">
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Prefix
                </label>
                <Select value={tollFreePrefix} onValueChange={setTollFreePrefix}>
                  <SelectTrigger className="h-9 text-[13px] cursor-pointer">
                    <SelectValue placeholder="Any prefix" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOLL_FREE_PREFIXES.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="cursor-pointer">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              size="sm"
              className="gap-1.5 cursor-pointer"
              disabled={searching}
              onClick={() => void handleSearch()}
            >
              {searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    {searchNumberType === "local" && <TableHead>Location</TableHead>}
                    <TableHead>Monthly</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((num) => (
                    <TableRow key={num.phoneNumber}>
                      <TableCell className="font-mono text-[13px]">
                        {formatPhoneDisplay(num.phoneNumber)}
                      </TableCell>
                      {searchNumberType === "local" && (
                        <TableCell className="text-[13px] text-muted-foreground">
                          {[num.city, num.state].filter(Boolean).join(", ") || "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-[13px]">
                        ${parseFloat(num.monthlyRate).toFixed(2)}/mo
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[11px] cursor-pointer"
                          disabled={purchasing === num.phoneNumber}
                          onClick={() => void handlePurchase(num.phoneNumber)}
                        >
                          {purchasing === num.phoneNumber ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3 w-3" />
                          )}
                          Purchase
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Release confirmation dialog */}
      <AlertDialog
        open={Boolean(releaseTarget)}
        onOpenChange={(open) => { if (!open) setReleaseTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Release Phone Number
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently release{" "}
              <span className="font-mono font-semibold">
                {releaseTarget ? formatPhoneDisplay(releaseTarget.phoneNumber) : ""}
              </span>{" "}
              from your account. You will no longer be able to send or receive
              SMS from this number. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={releasing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={releasing}
              onClick={(e) => {
                e.preventDefault()
                void handleRelease()
              }}
            >
              {releasing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Release Number
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
