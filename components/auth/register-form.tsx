"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Loader2 } from "lucide-react"
import { MaterialIcon } from "@/components/landing/atoms/MaterialIcon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { createAuthBrowserClient } from "@/lib/supabase/auth-client"
import { passwordSchema, PASSWORD_RULES } from "@/lib/auth/password-rules"

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Please enter a valid email address"),
    licenseNumber: z.string().min(1, "Agent License Number is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

// Intentionally no mapRegisterError — we never reveal whether
// an email is already registered. Always redirect to confirm page.

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      licenseNumber: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  })

  const passwordValue = form.watch("password")

  async function onSubmit(values: RegisterFormValues) {
    setAuthError(null)
    const supabase = createAuthBrowserClient()

    const nameParts = values.fullName.trim().split(/\s+/)
    const firstName = nameParts[0] ?? ""
    const lastName = nameParts.slice(1).join(" ")

    // Random delay to prevent timing-based email enumeration
    const delay = 100 + Math.random() * 200
    const [{ error }] = await Promise.all([
      supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
            license_number: values.licenseNumber,
          },
        },
      }),
      new Promise((r) => setTimeout(r, delay)),
    ])

    // Always redirect to confirm page — never reveal whether the
    // email already exists. Only show error for unexpected failures
    // (network issues, rate limiting) that don't leak account info.
    if (error && !error.message.includes("User already registered")) {
      setAuthError("Something went wrong. Please try again.")
      return
    }

    router.push(`/auth/confirm?email=${encodeURIComponent(values.email)}`)
  }

  return (
    <Card className="shadow-lg">
      {/* Header with person_add icon */}
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-brand-light">
          <MaterialIcon name="person_add" className="text-brand" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Create Agent Account
        </h1>
        <p className="text-sm text-muted-foreground">
          Join the platform to manage quotes and clients.
        </p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            aria-label="Create agent account form"
          >
            {/* Auth error banner */}
            {authError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {authError}
              </div>
            )}

            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MaterialIcon
                        name="person"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        placeholder="John Doe"
                        autoComplete="name"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MaterialIcon
                        name="email"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        type="email"
                        placeholder="agent@agency.com"
                        autoComplete="email"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* License Number */}
            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent License Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MaterialIcon
                        name="badge"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        placeholder="e.g. 849302"
                        autoComplete="off"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Create Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Create Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MaterialIcon
                        name="lock"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="pl-9 pr-9"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        <MaterialIcon
                          name={showPassword ? "visibility_off" : "visibility"}
                          size="sm"
                        />
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Requirements Checklist */}
            {passwordValue.length > 0 && (
              <div className="rounded border border-slate-100 bg-slate-50 p-3">
                <ul className="space-y-1.5">
                  {PASSWORD_RULES.map((rule) => {
                    const passing = rule.test(passwordValue)
                    return (
                      <li
                        key={rule.label}
                        className="flex items-center gap-2 text-xs"
                      >
                        <MaterialIcon
                          name={passing ? "check" : "radio_button_unchecked"}
                          size="sm"
                          className={
                            passing ? "text-green-500" : "text-slate-300"
                          }
                        />
                        <span
                          className={
                            passing ? "text-green-700" : "text-slate-500"
                          }
                        >
                          {rule.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MaterialIcon
                        name="lock_reset"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className="pl-9 pr-9"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((prev) => !prev)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        <MaterialIcon
                          name={
                            showConfirmPassword
                              ? "visibility_off"
                              : "visibility"
                          }
                          size="sm"
                        />
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Terms Checkbox */}
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="cursor-pointer text-sm font-normal text-slate-600">
                        I agree to the{" "}
                        <Link
                          href="/terms"
                          className="font-medium text-brand transition-colors hover:text-brand/80"
                        >
                          Terms and Conditions
                        </Link>
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        By creating an account, you agree to accept our privacy
                        policy.
                      </p>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
              size="lg"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium tracking-wide text-slate-400">
            ALREADY A MEMBER?
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Sign in CTA */}
        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 font-medium text-brand transition-colors hover:text-brand/80"
          >
            Sign in
            <ArrowRight className="size-3.5" />
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
