"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MaterialIcon } from "@/components/landing/atoms/MaterialIcon"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { createAuthBrowserClient } from "@/lib/supabase/auth-client"

const RESEND_COOLDOWN_SECONDS = 60

export function CheckEmailCard() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const type = searchParams.get("type")
  const isRecovery = type === "recovery"

  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleResend() {
    if (cooldown > 0 || !email) return
    setResending(true)
    setResendError(null)

    try {
      const supabase = createAuthBrowserClient()

      if (isRecovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/password/reset`,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
        })
        if (error) throw error
      }

      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch {
      setResendError("Failed to resend email. Please try again.")
    } finally {
      setResending(false)
    }
  }

  return (
    <Card className="shadow-lg">
      {/* Header with large email icon */}
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-20 items-center justify-center rounded-full bg-brand-light">
          <MaterialIcon
            name="mark_email_read"
            size="xl"
            className="text-brand"
          />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Check Your Email
        </h1>
        <p className="text-base text-slate-600">
          {isRecovery
            ? `We sent a password reset link to ${email ?? "your email address"}.`
            : `We sent a confirmation email to ${email ?? "your email address"}.`}
          {" "}Please follow the instructions to continue.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resend error */}
        {resendError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {resendError}
          </div>
        )}

        {/* Return to Login */}
        <Button
          asChild
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          size="lg"
        >
          <Link href="/auth/login">Return to Login</Link>
        </Button>

        {/* Resend CTA */}
        <p className="text-center text-sm text-slate-600">
          Did not receive the email?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
            className="font-medium text-brand transition-colors hover:text-brand/80 disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
          </button>
        </p>
      </CardContent>
    </Card>
  )
}
