"use client"

import { useEffect, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Camera } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/auth/auth-provider"
import { createAuthBrowserClient } from "@/lib/supabase/auth-client"
import { SettingsPageHeader } from "./settings-page-header"
import { US_STATES } from "@/lib/data/us-states"

const EXPERIENCE_RANGES = [
  "0-2 Years",
  "3-5 Years",
  "6-10 Years",
  "10+ Years",
] as const

const SPECIALIZATIONS = [
  { id: "term", label: "Term Life" },
  { id: "whole", label: "Whole Life" },
  { id: "universal", label: "Universal Life" },
  { id: "final_expense", label: "Final Expense" },
  { id: "annuities", label: "Annuities" },
] as const

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  phone: z.string().optional(),
  licensedState: z.string().optional(),
  brokerageName: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsExperience: z.string().optional(),
  specializations: z.array(z.string()),
})

type ProfileFormValues = z.infer<typeof profileSchema>

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-1 h-5 w-80" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

function getInitials(first: string, last: string, email: string): string {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

export function ProfileSettingsClient() {
  const { user, loading: authLoading } = useAuth()
  const [isSaving, setIsSaving] = useState(false)

  const meta = user?.user_metadata ?? {}

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      licensedState: "",
      brokerageName: "",
      licenseNumber: "",
      yearsExperience: "",
      specializations: [],
    },
  })

  // Pre-fill form when user data is available
  useEffect(() => {
    if (!user) return
    form.reset({
      firstName: (meta.first_name as string) ?? "",
      lastName: (meta.last_name as string) ?? "",
      email: user.email ?? "",
      phone: (meta.phone as string) ?? "",
      licensedState: (meta.licensed_state as string) ?? "",
      brokerageName: (meta.brokerage_name as string) ?? "",
      licenseNumber: (meta.license_number as string) ?? "",
      yearsExperience: (meta.years_experience as string) ?? "",
      specializations: (meta.specializations as string[]) ?? [],
    })
  }, [user, meta, form])

  async function onSubmit(values: ProfileFormValues) {
    setIsSaving(true)
    try {
      const supabase = createAuthBrowserClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
          phone: values.phone,
          licensed_state: values.licensedState,
          brokerage_name: values.brokerageName,
          license_number: values.licenseNumber,
          years_experience: values.yearsExperience,
          specializations: values.specializations,
        },
      })

      if (error) {
        toast.error("Failed to save profile")
        return
      }

      toast.success("Profile updated")
      // Reset dirty state after successful save
      form.reset(values)
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    if (!user) return
    form.reset({
      firstName: (meta.first_name as string) ?? "",
      lastName: (meta.last_name as string) ?? "",
      email: user.email ?? "",
      phone: (meta.phone as string) ?? "",
      licensedState: (meta.licensed_state as string) ?? "",
      brokerageName: (meta.brokerage_name as string) ?? "",
      licenseNumber: (meta.license_number as string) ?? "",
      yearsExperience: (meta.years_experience as string) ?? "",
      specializations: (meta.specializations as string[]) ?? [],
    })
  }

  if (authLoading) return <ProfileSkeleton />

  const initials = getInitials(
    form.watch("firstName"),
    form.watch("lastName"),
    form.watch("email"),
  )

  const isDirty = form.formState.isDirty

  return (
    <div>
      <SettingsPageHeader
        title="Profile Settings"
        description="Manage your personal and professional information."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>
                Your identity details as they appear across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar row */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1e293b] text-lg font-bold text-white">
                  {initials}
                </div>
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Photo upload coming soon")}
                  >
                    <Camera className="mr-2 h-3.5 w-3.5" />
                    Change Photo
                  </Button>
                  <p className="text-xs text-[#94a3b8]">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              {/* Name fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email + Phone */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          disabled
                          className="bg-[#f9fafb]"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-[#94a3b8]">
                        Contact support to change your email.
                      </p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Licensed State */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="licensedState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Licensed State</FormLabel>
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
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Professional Information
              </CardTitle>
              <CardDescription>
                Your brokerage and licensing details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brokerage + NPN */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="brokerageName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brokerage Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Acme Insurance Group"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number (NPN)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Experience */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="yearsExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPERIENCE_RANGES.map((range) => (
                            <SelectItem key={range} value={range}>
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Specializations */}
              <FormField
                control={form.control}
                name="specializations"
                render={() => (
                  <FormItem>
                    <FormLabel>Specializations</FormLabel>
                    <div className="mt-2 grid gap-3 md:grid-cols-3">
                      {SPECIALIZATIONS.map((spec) => (
                        <FormField
                          key={spec.id}
                          control={form.control}
                          name="specializations"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value.includes(spec.id)}
                                  onCheckedChange={(checked) => {
                                    const next = checked
                                      ? [...field.value, spec.id]
                                      : field.value.filter(
                                          (v) => v !== spec.id,
                                        )
                                    field.onChange(next)
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {spec.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!isDirty || isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
