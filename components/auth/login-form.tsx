"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or Agent Number is required"),
  password: z.string().min(1, "Password is required"),
  rememberDevice: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

// Generic error — prevents email enumeration by never revealing
// whether the email exists, is unconfirmed, or the password is wrong.
const GENERIC_LOGIN_ERROR =
  "Invalid email or password. If you recently signed up, check your email for a confirmation link."

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleGoogleSignIn = useCallback(async () => {
    setAuthError(null)
    setGoogleLoading(true)
    try {
      const supabase = createAuthBrowserClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setAuthError("Unable to sign in with Google. Please try again.")
        setGoogleLoading(false)
      }
      // If no error, browser will redirect to Google — keep loading state
    } catch {
      setAuthError("Unable to sign in with Google. Please try again.")
      setGoogleLoading(false)
    }
  }, [])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberDevice: false,
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setAuthError(null)
    const supabase = createAuthBrowserClient()

    // Random delay to prevent timing-based email enumeration
    const delay = 100 + Math.random() * 200
    const [{ error }] = await Promise.all([
      supabase.auth.signInWithPassword({
        email: values.identifier,
        password: values.password,
      }),
      new Promise((r) => setTimeout(r, delay)),
    ])

    if (error) {
      setAuthError(GENERIC_LOGIN_ERROR)
      return
    }

    const rawRedirect = searchParams.get("redirect") || "/dashboard"
    // Only allow relative paths — block absolute URLs, protocol-relative, etc.
    const redirect =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
        ? rawRedirect
        : "/dashboard"
    router.push(redirect)
    router.refresh()
  }

  return (
    <Card className="shadow-lg">
      {/* Header with shield icon */}
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-brand-light">
          <MaterialIcon name="shield" className="text-brand" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Agent Portal Login
        </h1>
        <p className="text-sm text-muted-foreground">
          Access your dashboard and manage client quotes securely
        </p>
      </CardHeader>

      <CardContent>
        {/* Auth error banner */}
        {authError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {authError}
          </div>
        )}

        {/* Google OAuth — configured in Supabase Dashboard > Auth > Providers > Google.
            Uses Supabase's own Google provider config, NOT the GOOGLE_CLIENT_ID in .env.local
            (that one is for Google Calendar API integration). */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={googleLoading || form.formState.isSubmitting}
          onClick={handleGoogleSignIn}
          className="w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        >
          {googleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium tracking-wide text-slate-400">
            OR
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            aria-label="Agent login form"
          >

            {/* Email / Agent Number */}
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Agent Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MaterialIcon
                        name="badge"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        placeholder="e.g. agent@agency.com or 849302"
                        autoComplete="username"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/auth/password"
                      className="text-xs font-medium text-brand transition-colors hover:text-brand/80"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <MaterialIcon
                        name="lock"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="........"
                        autoComplete="current-password"
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

            {/* Remember me */}
            <FormField
              control={form.control}
              name="rememberDevice"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer text-sm font-normal text-slate-600">
                      Remember this device for 30 days
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || googleLoading}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
              size="lg"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium tracking-wide text-slate-400">
            NEW TO THE PLATFORM?
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Sign up CTA */}
        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1 font-medium text-brand transition-colors hover:text-brand/80"
          >
            Sign up now
            <ArrowRight className="size-3.5" />
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
