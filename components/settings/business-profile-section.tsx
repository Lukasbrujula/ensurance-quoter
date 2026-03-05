"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { BookOpen, Bot, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { FAQEditor } from "@/components/agents/faq-editor"
import type { FAQEntry } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KB_MAX_CHARS = 2000
const KB_WARN_CHARS = 1800

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BusinessProfile {
  businessName: string
  knowledgeBase: string
  faq: FAQEntry[]
}

const EMPTY_PROFILE: BusinessProfile = {
  businessName: "",
  knowledgeBase: "",
  faq: [],
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessProfileSection() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [original, setOriginal] = useState<BusinessProfile>(EMPTY_PROFILE)
  const [businessName, setBusinessName] = useState("")
  const [knowledgeBase, setKnowledgeBase] = useState("")
  const [faq, setFaq] = useState<FAQEntry[]>([])

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/business-profile")
      if (!res.ok) return
      const data: BusinessProfile = await res.json()
      setOriginal(data)
      setBusinessName(data.businessName)
      setKnowledgeBase(data.knowledgeBase)
      setFaq(data.faq)
    } catch {
      // Use empty defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const isDirty =
    businessName !== original.businessName ||
    knowledgeBase !== original.knowledgeBase ||
    JSON.stringify(faq) !== JSON.stringify(original.faq)

  const charCount = knowledgeBase.length
  const isOverLimit = charCount > KB_MAX_CHARS
  const isNearLimit = charCount > KB_WARN_CHARS

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: BusinessProfile = {
        businessName: businessName.trim(),
        knowledgeBase: knowledgeBase.trim(),
        faq,
      }
      const res = await fetch("/api/settings/business-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
      setOriginal(payload)
      toast.success("Business profile saved")
    } catch {
      toast.error("Failed to save business profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Skeleton className="h-64 rounded-lg" />
  }

  return (
    <div className="space-y-6">
      {/* AI Business Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0fdf4]">
              <Bot className="h-4.5 w-4.5 text-[#16a34a]" />
            </div>
            <div>
              <CardTitle className="text-base">
                AI Agent Business Profile
              </CardTitle>
              <CardDescription>
                Global knowledge base applied to all your AI agents. Individual
                agents can add their own overrides.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="bp-business-name">Business Name</Label>
            <Input
              id="bp-business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Smith Insurance Group"
              maxLength={200}
            />
            <p className="text-[11px] text-muted-foreground">
              Shown to callers when your AI agents answer the phone.
            </p>
          </div>

          <Separator />

          {/* Knowledge Base */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Knowledge Base
            </Label>
            <Textarea
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              placeholder="Example: Our office hours are 9am-5pm Mon-Fri. We offer term life, whole life, and final expense policies. Our minimum coverage is $25,000..."
              rows={6}
              className={
                isOverLimit
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Information all your AI agents can reference during calls.
              </p>
              <p
                className={`text-xs ${
                  isOverLimit
                    ? "font-medium text-red-600 dark:text-red-400"
                    : isNearLimit
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                }`}
              >
                {charCount.toLocaleString()} / {KB_MAX_CHARS.toLocaleString()}
                {isOverLimit && " (over limit)"}
              </p>
            </div>
          </div>

          <Separator />

          {/* FAQ */}
          <div className="space-y-2">
            <Label>Frequently Asked Questions</Label>
            <p className="text-xs text-muted-foreground">
              Q&A pairs all your AI agents can answer during calls.
            </p>
            <FAQEditor entries={faq} onChange={setFaq} />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || saving || isOverLimit}
          onClick={handleSave}
        >
          {saving && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          Save Business Profile
        </Button>
      </div>
    </div>
  )
}
