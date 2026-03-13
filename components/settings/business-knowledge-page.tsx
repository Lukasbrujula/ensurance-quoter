"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  Building2,
  Clock,
  BookOpen,
  HelpCircle,
  Globe,
  Upload,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
} from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { SettingsPageHeader } from "./settings-page-header"
import type { FAQEntry } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KB_MAX_CHARS = 5000
const KB_WARN_PERCENT = 0.7
const KB_DANGER_PERCENT = 0.9
const FILE_MAX_BYTES = 5 * 1024 * 1024

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

type DayKey = (typeof DAYS)[number]

const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

interface DaySchedule {
  open: boolean
  from: string
  to: string
}

type WeekSchedule = Record<DayKey, DaySchedule>

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { open: true, from: "09:00", to: "17:00" },
  tuesday: { open: true, from: "09:00", to: "17:00" },
  wednesday: { open: true, from: "09:00", to: "17:00" },
  thursday: { open: true, from: "09:00", to: "17:00" },
  friday: { open: true, from: "09:00", to: "17:00" },
  saturday: { open: false, from: "09:00", to: "17:00" },
  sunday: { open: false, from: "09:00", to: "17:00" },
}

/* ------------------------------------------------------------------ */
/*  Time slot options — 30-min increments 6:00 AM – 10:00 PM          */
/* ------------------------------------------------------------------ */

function generateTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = []
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) continue
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
      const ampm = h >= 12 ? "PM" : "AM"
      const label = `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
      slots.push({ value, label })
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

/* ------------------------------------------------------------------ */
/*  Profile shape                                                      */
/* ------------------------------------------------------------------ */

interface BusinessKnowledgeProfile {
  businessName: string
  knowledgeBase: string
  faq: FAQEntry[]
  businessHours: WeekSchedule
}

const EMPTY_PROFILE: BusinessKnowledgeProfile = {
  businessName: "",
  knowledgeBase: "",
  faq: [],
  businessHours: DEFAULT_SCHEDULE,
}

/* ------------------------------------------------------------------ */
/*  Scrape preview state                                               */
/* ------------------------------------------------------------------ */

interface ScrapePreview {
  url: string
  text: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessKnowledgePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [original, setOriginal] = useState<BusinessKnowledgeProfile>(EMPTY_PROFILE)

  const [businessName, setBusinessName] = useState("")
  const [knowledgeBase, setKnowledgeBase] = useState("")
  const [faq, setFaq] = useState<FAQEntry[]>([])
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)

  // Scraper
  const [scrapeUrl, setScrapeUrl] = useState("")
  const [scraping, setScraping] = useState(false)
  const [scrapePreview, setScrapePreview] = useState<ScrapePreview | null>(null)

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // FAQ modal
  const [faqModalOpen, setFaqModalOpen] = useState(false)
  const [faqEditId, setFaqEditId] = useState<string | null>(null)
  const [faqQuestion, setFaqQuestion] = useState("")
  const [faqAnswer, setFaqAnswer] = useState("")

  // FAQ delete confirmation
  const [faqDeleteId, setFaqDeleteId] = useState<string | null>(null)

  /* ── Load profile ────────────────────────────────────────────────── */

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/business-profile")
      if (!res.ok) return
      const data = await res.json() as {
        businessName?: string
        knowledgeBase?: string
        faq?: FAQEntry[]
        businessHours?: WeekSchedule
      }
      const profile: BusinessKnowledgeProfile = {
        businessName: data.businessName ?? "",
        knowledgeBase: data.knowledgeBase ?? "",
        faq: Array.isArray(data.faq) ? data.faq : [],
        businessHours: data.businessHours ?? DEFAULT_SCHEDULE,
      }
      setOriginal(profile)
      setBusinessName(profile.businessName)
      setKnowledgeBase(profile.knowledgeBase)
      setFaq(profile.faq)
      setSchedule(profile.businessHours)
    } catch {
      // Use empty defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  /* ── Dirty check ─────────────────────────────────────────────────── */

  const isDirty =
    businessName !== original.businessName ||
    knowledgeBase !== original.knowledgeBase ||
    JSON.stringify(faq) !== JSON.stringify(original.faq) ||
    JSON.stringify(schedule) !== JSON.stringify(original.businessHours)

  /* ── KB helpers ──────────────────────────────────────────────────── */

  const charCount = knowledgeBase.length
  const charPercent = charCount / KB_MAX_CHARS
  const isOverLimit = charCount > KB_MAX_CHARS

  const progressColor =
    charPercent >= KB_DANGER_PERCENT
      ? "bg-red-500"
      : charPercent >= KB_WARN_PERCENT
        ? "bg-amber-500"
        : "bg-emerald-500"

  const appendToKnowledgeBase = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setKnowledgeBase((prev) => {
      const base = prev.trim()
      const joined = base ? `${base}\n\n${trimmed}` : trimmed
      return joined.slice(0, KB_MAX_CHARS)
    })
  }, [])

  /* ── URL scraper ─────────────────────────────────────────────────── */

  const handleScrape = useCallback(async () => {
    const url = scrapeUrl.trim()
    if (!url) return

    setScraping(true)
    try {
      const res = await fetch("/api/agents/scrape-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json() as { text?: string; error?: string }

      if (!res.ok || data.error) {
        toast.error(data.error ?? "Failed to import website")
        return
      }

      if (data.text) {
        setScrapePreview({ url, text: data.text })
        setScrapeUrl("")
      }
    } catch {
      toast.error("Failed to import website")
    } finally {
      setScraping(false)
    }
  }, [scrapeUrl])

  const handleAcceptScrape = useCallback(() => {
    if (!scrapePreview) return
    appendToKnowledgeBase(scrapePreview.text)
    setScrapePreview(null)
    toast.success("Content added to knowledge base")
  }, [scrapePreview, appendToKnowledgeBase])

  const handleDiscardScrape = useCallback(() => {
    setScrapePreview(null)
  }, [])

  /* ── File upload ─────────────────────────────────────────────────── */

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (fileInputRef.current) fileInputRef.current.value = ""

      if (file.size > FILE_MAX_BYTES) {
        toast.error("File too large — maximum 5 MB")
        return
      }

      const ext = file.name.split(".").pop()?.toLowerCase()

      try {
        let extracted = ""

        if (ext === "txt") {
          extracted = await file.text()
        } else if (ext === "pdf") {
          extracted = await extractPdfText(file)
        } else {
          toast.error("Unsupported file type — use .pdf or .txt")
          return
        }

        if (!extracted.trim()) {
          toast.error("No text content found in file")
          return
        }

        appendToKnowledgeBase(extracted)
        toast.success(
          `Extracted ${extracted.trim().length.toLocaleString()} characters from ${file.name}`,
        )
      } catch {
        toast.error("Failed to extract text from file")
      }
    },
    [appendToKnowledgeBase],
  )

  /* ── Schedule helpers ────────────────────────────────────────────── */

  const updateDay = useCallback(
    (day: DayKey, patch: Partial<DaySchedule>) => {
      setSchedule((prev) => ({
        ...prev,
        [day]: { ...prev[day], ...patch },
      }))
    },
    [],
  )

  /* ── FAQ modal helpers ───────────────────────────────────────────── */

  const openAddFaq = useCallback(() => {
    setFaqEditId(null)
    setFaqQuestion("")
    setFaqAnswer("")
    setFaqModalOpen(true)
  }, [])

  const openEditFaq = useCallback(
    (entry: FAQEntry) => {
      setFaqEditId(entry.id)
      setFaqQuestion(entry.question)
      setFaqAnswer(entry.answer)
      setFaqModalOpen(true)
    },
    [],
  )

  const handleSaveFaq = useCallback(() => {
    const q = faqQuestion.trim()
    const a = faqAnswer.trim()
    if (!q || !a) return

    if (faqEditId) {
      setFaq((prev) =>
        prev.map((e) =>
          e.id === faqEditId ? { ...e, question: q, answer: a } : e,
        ),
      )
    } else {
      const entry: FAQEntry = {
        id: crypto.randomUUID(),
        question: q,
        answer: a,
      }
      setFaq((prev) => [...prev, entry])
    }

    setFaqModalOpen(false)
    setFaqEditId(null)
    setFaqQuestion("")
    setFaqAnswer("")
  }, [faqEditId, faqQuestion, faqAnswer])

  const handleDeleteFaq = useCallback(() => {
    if (!faqDeleteId) return
    setFaq((prev) => prev.filter((e) => e.id !== faqDeleteId))
    setFaqDeleteId(null)
  }, [faqDeleteId])

  /* ── Save ────────────────────────────────────────────────────────── */

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        businessName: businessName.trim(),
        knowledgeBase: knowledgeBase.trim(),
        faq,
        businessHours: schedule,
      }
      const res = await fetch("/api/settings/business-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
      setOriginal({
        businessName: payload.businessName,
        knowledgeBase: payload.knowledgeBase,
        faq: payload.faq,
        businessHours: payload.businessHours,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  /* ── Loading skeleton ────────────────────────────────────────────── */

  if (loading) {
    return (
      <div>
        <SettingsPageHeader
          title="Business Knowledge"
          description="What your AI agents know about your business."
        />
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    )
  }

  /* ── Determine if textarea should show ───────────────────────────── */
  const showTextarea = knowledgeBase.length > 0

  return (
    <div>
      <SettingsPageHeader
        title="Business Knowledge"
        description="What your AI agents know about your business."
      />

      <div className="space-y-6">
        {/* ── Section 1: Business Name ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff6ff]">
                <Building2 className="h-4.5 w-4.5 text-[#1773cf]" />
              </div>
              <div>
                <CardTitle className="text-base">Business Name</CardTitle>
                <CardDescription>
                  How your agents introduce your agency on calls.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Smith Insurance Group"
              maxLength={200}
            />
          </CardContent>
        </Card>

        {/* ── Section 2: Business Hours ────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0fdf4]">
                <Clock className="h-4.5 w-4.5 text-[#16a34a]" />
              </div>
              <div>
                <CardTitle className="text-base">Business Hours</CardTitle>
                <CardDescription>
                  Your agents will share these when callers ask about availability.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DAYS.map((day) => {
                const daySchedule = schedule[day]
                return (
                  <div
                    key={day}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                  >
                    <div className="flex w-24 shrink-0 items-center gap-2">
                      <Switch
                        checked={daySchedule.open}
                        onCheckedChange={(checked) =>
                          updateDay(day, { open: checked })
                        }
                        aria-label={`Toggle ${DAY_LABELS[day]}`}
                      />
                      <span className="text-sm font-medium">
                        {DAY_LABELS[day].slice(0, 3)}
                      </span>
                    </div>

                    {daySchedule.open ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={daySchedule.from}
                          onValueChange={(v) => updateDay(day, { from: v })}
                        >
                          <SelectTrigger className="h-8 w-[120px] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((slot) => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">to</span>
                        <Select
                          value={daySchedule.to}
                          onValueChange={(v) => updateDay(day, { to: v })}
                        >
                          <SelectTrigger className="h-8 w-[120px] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((slot) => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Closed
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Knowledge Base ────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fef9ee]">
                <BookOpen className="h-4.5 w-4.5 text-[#d97706]" />
              </div>
              <div>
                <CardTitle className="text-base">
                  What should your agents know?
                </CardTitle>
                <CardDescription>
                  Import from a website, upload a file, or type directly. This
                  information is shared with all your AI agents.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL import row */}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://your-website.com/about"
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleScrape()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 cursor-pointer"
                disabled={!scrapeUrl.trim() || scraping}
                onClick={() => void handleScrape()}
              >
                {scraping ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </div>

            {/* Scrape preview card */}
            {scrapePreview && (
              <div className="relative overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                <p className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {scrapePreview.url}
                </p>
                <div className="relative max-h-[100px] overflow-hidden">
                  <p className="text-sm text-muted-foreground">
                    {scrapePreview.text.slice(0, 300)}
                  </p>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-emerald-50/90 to-transparent dark:from-emerald-950/50" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 cursor-pointer"
                    onClick={handleAcceptScrape}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Add to Knowledge Base
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 cursor-pointer"
                    onClick={handleDiscardScrape}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}

            {/* Textarea — only visible when content exists */}
            {showTextarea && (
              <div className="space-y-2">
                <Textarea
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  placeholder="Paste or type information your agents should know…"
                  rows={8}
                  className={
                    isOverLimit
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor}`}
                      style={{
                        width: `${Math.min(charPercent * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p
                    className={`text-right text-xs ${
                      isOverLimit
                        ? "font-medium text-red-600 dark:text-red-400"
                        : charPercent >= KB_WARN_PERCENT
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {charCount.toLocaleString()} / {KB_MAX_CHARS.toLocaleString()}
                    {isOverLimit && " (over limit)"}
                  </p>
                </div>
              </div>
            )}

            {/* File upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => void handleFileUpload(e)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground"
            >
              <Upload className="h-4 w-4" />
              Upload .pdf or .txt — Max 5 MB
            </button>
          </CardContent>
        </Card>

        {/* ── Section 4: FAQ ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#faf5ff]">
                  <HelpCircle className="h-4.5 w-4.5 text-[#9333ea]" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Frequently Asked Questions
                  </CardTitle>
                  <CardDescription>
                    Your agents will answer these during calls.
                  </CardDescription>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {faq.length} / 20
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {faq.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No FAQ entries yet. Add questions your AI agents can answer.
              </p>
            )}

            {faq.length > 0 && (
              <Accordion type="multiple" className="w-full">
                {faq.map((entry) => (
                  <AccordionItem key={entry.id} value={entry.id}>
                    <div className="flex items-center">
                      <AccordionTrigger className="flex-1 text-left text-sm font-medium">
                        {entry.question}
                      </AccordionTrigger>
                      <div className="flex shrink-0 items-center gap-1 pr-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditFaq(entry)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer text-red-500 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFaqDeleteId(entry.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {entry.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {faq.length < 20 && (
              <Button
                type="button"
                variant="outline"
                className="w-full cursor-pointer border-dashed"
                onClick={openAddFaq}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Question
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Save button ──────────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button
            type="button"
            className="w-full cursor-pointer sm:w-auto"
            disabled={!isDirty || saving || isOverLimit}
            onClick={handleSave}
          >
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {saved ? (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Saved
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* ── FAQ Add/Edit Modal ─────────────────────────────────────── */}
      <Dialog open={faqModalOpen} onOpenChange={setFaqModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {faqEditId ? "Edit Question" : "Add Question"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="faq-question">Question</Label>
              <Input
                id="faq-question"
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                placeholder="What types of insurance do you offer?"
                maxLength={500}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea
                id="faq-answer"
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                placeholder="We specialize in term life insurance, whole life, and final expense policies."
                rows={4}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => setFaqModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!faqQuestion.trim() || !faqAnswer.trim()}
              onClick={handleSaveFaq}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FAQ Delete Confirmation ────────────────────────────────── */}
      <AlertDialog
        open={!!faqDeleteId}
        onOpenChange={(open) => {
          if (!open) setFaqDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This FAQ entry will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteFaq}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PDF text extraction via PDF.js CDN                                 */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (params: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number
          getPage: (num: number) => Promise<{
            getTextContent: () => Promise<{
              items: Array<{ str?: string }>
            }>
          }>
        }>
      }
      GlobalWorkerOptions: { workerSrc: string }
    }
  }
}

const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155"

async function loadPdfJs(): Promise<NonNullable<typeof window.pdfjsLib>> {
  if (window.pdfjsLib) return window.pdfjsLib

  return new Promise((resolve, reject) => {
    const classicScript = document.createElement("script")
    classicScript.src = `${PDFJS_CDN}/pdf.min.js`
    classicScript.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`
        resolve(window.pdfjsLib)
      } else {
        reject(new Error("PDF.js failed to initialize"))
      }
    }
    classicScript.onerror = () => reject(new Error("Failed to load PDF.js"))
    document.head.appendChild(classicScript)
  })
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs()
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => item.str ?? "")
      .join(" ")
    pages.push(text)
  }

  return pages.join("\n\n")
}
