"use client"

import Link from "next/link"
import { Bot, BookOpen, MessageSquareText, ArrowRight } from "lucide-react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBusinessProfile } from "@/hooks/use-business-profile"

/* ------------------------------------------------------------------ */
/*  Compact dashboard widget — read-only summary + link to settings    */
/* ------------------------------------------------------------------ */

export function BusinessProfileCard() {
  const { loading, profile } = useBusinessProfile()

  if (loading) {
    return <Skeleton className="h-28 rounded-lg" />
  }

  const hasName = !!profile.businessName
  const kbChars = profile.knowledgeBase.length
  const faqCount = profile.faq.length
  const isEmpty = !hasName && kbChars === 0 && faqCount === 0

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0fdf4]">
              <Bot className="h-4.5 w-4.5 text-[#16a34a]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                AI Business Profile
              </p>
              {isEmpty ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Not configured yet
                </p>
              ) : (
                <>
                  {hasName && (
                    <p className="mt-1 truncate text-sm font-semibold">
                      {profile.businessName}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {kbChars > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {kbChars.toLocaleString()} chars
                      </span>
                    )}
                    {faqCount > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquareText className="h-3 w-3" />
                        {faqCount} FAQ{faqCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs shrink-0">
            <Link href="/settings/business">
              {isEmpty ? "Set up" : "Edit"}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
