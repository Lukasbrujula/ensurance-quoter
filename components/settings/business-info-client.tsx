"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Building2, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SettingsPageHeader } from "./settings-page-header"

/* ------------------------------------------------------------------ */
/*  Schema                                                              */
/* ------------------------------------------------------------------ */

const businessInfoSchema = z.object({
  companyName: z.string().max(200),
  address: z.string().max(300),
  city: z.string().max(100),
  state: z.string().max(2),
  zipCode: z.string().max(10),
  businessType: z.string().max(100),
  ein: z.string().max(20),
  eoInsurance: z.string().max(200),
  eoExpiry: z.string().max(10),
})

type BusinessInfoValues = z.infer<typeof businessInfoSchema>

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "LLC",
  "S-Corp",
  "C-Corp",
  "Partnership",
  "Other",
] as const

const EMPTY_VALUES: BusinessInfoValues = {
  companyName: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  businessType: "",
  ein: "",
  eoInsurance: "",
  eoExpiry: "",
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessInfoClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<BusinessInfoValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: EMPTY_VALUES,
  })

  const businessType = watch("businessType")

  const loadInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/business")
      if (!res.ok) return
      const data: BusinessInfoValues = await res.json()
      reset(data)
    } catch {
      // Use empty defaults
    } finally {
      setLoading(false)
    }
  }, [reset])

  useEffect(() => {
    void loadInfo()
  }, [loadInfo])

  const onSubmit = async (values: BusinessInfoValues) => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error("Save failed")
      reset(values)
      toast.success("Business information saved")
    } catch {
      toast.error("Failed to save business information")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <SettingsPageHeader
          title="Business Information"
          description="Your brokerage details and business entity information."
        />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  return (
    <div>
      <SettingsPageHeader
        title="Business Information"
        description="Your brokerage details and business entity information."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff6ff]">
                <Building2 className="h-4.5 w-4.5 text-[#1773cf]" />
              </div>
              <div>
                <CardTitle className="text-base">Company Details</CardTitle>
                <CardDescription>
                  Your brokerage name, address, and entity type.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company / DBA Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Insurance Group"
                {...register("companyName")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, Suite 100"
                {...register("address")}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Dallas"
                  {...register("city")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="TX"
                  maxLength={2}
                  className="uppercase"
                  {...register("state")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  placeholder="75201"
                  maxLength={10}
                  {...register("zipCode")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                value={businessType}
                onValueChange={(v) => setValue("businessType", v, { shouldDirty: true })}
              >
                <SelectTrigger id="businessType">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ein">EIN / Tax ID</Label>
              <Input
                id="ein"
                placeholder="XX-XXXXXXX"
                maxLength={20}
                {...register("ein")}
              />
              <p className="text-[11px] text-muted-foreground">
                Stored securely. Used for carrier appointments only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* E&O Insurance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">E&O Insurance</CardTitle>
            <CardDescription>
              Errors & Omissions coverage details for carrier compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eoInsurance">E&O Provider / Policy</Label>
              <Input
                id="eoInsurance"
                placeholder="NAPA E&O — Policy #12345"
                {...register("eoInsurance")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eoExpiry">Expiration Date</Label>
              <Input
                id="eoExpiry"
                type="date"
                {...register("eoExpiry")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || saving} size="sm">
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
