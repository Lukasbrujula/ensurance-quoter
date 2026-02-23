"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { MaterialIcon } from "@/components/landing/atoms/MaterialIcon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const passwordResetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>

export function PasswordResetForm() {
  const router = useRouter()

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: PasswordResetFormValues) {
    const supabase = createAuthBrowserClient()

    // Random delay to prevent timing-based email enumeration
    const delay = 100 + Math.random() * 200
    await Promise.all([
      supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/password/reset`,
      }),
      new Promise((r) => setTimeout(r, delay)),
    ])

    // Always redirect to confirm page — never reveal whether the
    // email exists. Supabase may or may not send an email, but the
    // user sees the same "check your email" page regardless.
    router.push(
      `/auth/confirm?email=${encodeURIComponent(values.email)}&type=recovery`
    )
  }

  return (
    <Card className="shadow-lg">
      {/* Header with lock_reset icon */}
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-brand-light">
          <MaterialIcon name="lock_reset" className="text-brand" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Reset Your Password
        </h1>
        <p className="text-sm text-muted-foreground">
          For security reasons, please enter your email address below to receive
          a password reset link.
        </p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            aria-label="Password reset request form"
          >
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
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        </Form>

        {/* Back to Sign In */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-800"
          >
            <MaterialIcon name="arrow_back" size="sm" />
            Back to Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
