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
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingsPageHeader } from "./settings-page-header"
import { formatPhoneDisplay } from "@/lib/utils/phone"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PhoneNumber {
  id: string
  phoneNumber: string
  isPrimary: boolean
  label: string | null
  smsEnabled: boolean
  voiceEnabled: boolean
  createdAt: string
}

interface AvailableNumber {
  phoneNumber: string
  city: string | null
  state: string | null
  monthlyRate: string
}

/* ------------------------------------------------------------------ */
/*  US States for search                                               */
/* ------------------------------------------------------------------ */

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const

const searchSchema = z.object({
  state: z.string().optional(),
  areaCode: z.string().max(6).optional(),
})

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PhoneNumbersSettingsClient() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchState, setSearchState] = useState("")
  const [searchAreaCode, setSearchAreaCode] = useState("")
  const [searchResults, setSearchResults] = useState<AvailableNumber[]>([])
  const [searching, setSearching] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [releaseTarget, setReleaseTarget] = useState<PhoneNumber | null>(null)
  const [releasing, setReleasing] = useState(false)

  const loadNumbers = useCallback(async () => {
    try {
      const res = await fetch("/api/phone-numbers")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as { numbers: PhoneNumber[] }
      setNumbers(data.numbers)
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
    const parsed = searchSchema.safeParse({
      state: searchState || undefined,
      areaCode: searchAreaCode || undefined,
    })
    if (!parsed.success) return

    setSearching(true)
    setSearchResults([])

    try {
      const res = await fetch("/api/phone-numbers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
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
  }, [searchState, searchAreaCode])

  const handlePurchase = useCallback(async (phoneNumber: string) => {
    setPurchasing(phoneNumber)
    try {
      const res = await fetch("/api/phone-numbers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
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
  }, [loadNumbers])

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

  return (
    <div>
      <SettingsPageHeader
        title="Phone Numbers"
        description="Purchase and manage phone numbers for SMS messaging."
      />

      {/* Your Numbers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Phone className="h-4 w-4" />
            Your Numbers
          </CardTitle>
          <CardDescription>
            Phone numbers you own. The primary number is used for outbound SMS.
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
                          className="h-6 px-2 text-[11px] text-muted-foreground"
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
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
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
        </CardContent>
      </Card>

      {/* Get a Number */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <ShoppingCart className="h-4 w-4" />
            Get a Number
          </CardTitle>
          <CardDescription>
            Search for available phone numbers by state or area code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                State
              </label>
              <Select value={searchState} onValueChange={setSearchState}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Any state" />
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
            <Button
              size="sm"
              className="gap-1.5"
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
                    <TableHead>Location</TableHead>
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
                      <TableCell className="text-[13px] text-muted-foreground">
                        {[num.city, num.state].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-[13px]">
                        ${num.monthlyRate}/mo
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[11px]"
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
