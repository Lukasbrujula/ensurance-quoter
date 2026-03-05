"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { BookOpen, Bot, Globe, Loader2, Upload } from "lucide-react"
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

export interface BusinessProfile {
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
/*  Hook — shared data loading logic                                   */
/* ------------------------------------------------------------------ */

export function useBusinessProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<BusinessProfile>(EMPTY_PROFILE)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/business-profile")
      if (!res.ok) return
      const data: BusinessProfile = await res.json()
      setProfile(data)
    } catch {
      // Use empty defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, profile, reload: load }
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BusinessProfileSectionProps {
  /** Compact mode strips the outer Card wrapper and icon header for sidebar use */
  compact?: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const FILE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export function BusinessProfileSection({
  compact = false,
}: BusinessProfileSectionProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [original, setOriginal] = useState<BusinessProfile>(EMPTY_PROFILE)
  const [businessName, setBusinessName] = useState("")
  const [knowledgeBase, setKnowledgeBase] = useState("")
  const [faq, setFaq] = useState<FAQEntry[]>([])

  // URL scraper state
  const [scrapeUrl, setScrapeUrl] = useState("")
  const [scraping, setScraping] = useState(false)

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedCharCount, setUploadedCharCount] = useState(0)

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

  /* ── Append text respecting the char budget ────────────────────── */

  const appendToKnowledgeBase = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setKnowledgeBase((prev) => {
        const base = prev.trim()
        const joined = base ? `${base}\n\n${trimmed}` : trimmed
        return joined.slice(0, KB_MAX_CHARS)
      })
    },
    [],
  )

  /* ── URL scraper handler ─────────────────────────────────────── */

  const handleScrape = useCallback(async () => {
    const url = scrapeUrl.trim()
    if (!url) return

    setScraping(true)
    try {
      const res = await fetch(
        `/api/agents/scrape-preview?url=${encodeURIComponent(url)}`,
      )
      const data: { text?: string; error?: string } = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error ?? "Failed to scrape website")
        return
      }

      if (data.text) {
        appendToKnowledgeBase(data.text)
        setScrapeUrl("")
        toast.success("Website content added to knowledge base")
      }
    } catch {
      toast.error("Failed to scrape website")
    } finally {
      setScraping(false)
    }
  }, [scrapeUrl, appendToKnowledgeBase])

  /* ── File upload handler ─────────────────────────────────────── */

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Reset input so the same file can be re-selected
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
        setUploadedFileName(file.name)
        setUploadedCharCount(extracted.trim().length)
        toast.success(`Extracted ${extracted.trim().length.toLocaleString()} characters from ${file.name}`)
      } catch {
        toast.error("Failed to extract text from file")
      }
    },
    [appendToKnowledgeBase],
  )

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
    return <Skeleton className={compact ? "h-48 rounded-lg" : "h-64 rounded-lg"} />
  }

  const formContent = (
    <div className="space-y-4">
      {/* Business Name */}
      <div className="space-y-1.5">
        <Label htmlFor="bp-business-name" className={compact ? "text-xs" : undefined}>
          Business Name
        </Label>
        <Input
          id="bp-business-name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Smith Insurance Group"
          maxLength={200}
          className={compact ? "h-8 text-sm" : undefined}
        />
        {!compact && (
          <p className="text-[11px] text-muted-foreground">
            Shown to callers when your AI agents answer the phone.
          </p>
        )}
      </div>

      <Separator />

      {/* Knowledge Base */}
      <div className="space-y-1.5">
        <Label className={`flex items-center gap-1.5 ${compact ? "text-xs" : ""}`}>
          <BookOpen className="h-3.5 w-3.5" />
          Knowledge Base
        </Label>
        <Textarea
          value={knowledgeBase}
          onChange={(e) => setKnowledgeBase(e.target.value)}
          placeholder={compact
            ? "Info your AI agents can reference..."
            : "Example: Our office hours are 9am-5pm Mon-Fri. We offer term life, whole life, and final expense policies. Our minimum coverage is $25,000..."
          }
          rows={compact ? 4 : 6}
          className={
            isOverLimit
              ? "border-red-500 focus-visible:ring-red-500"
              : ""
          }
        />
        <div className="flex items-center justify-between">
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Information all your AI agents can reference during calls.
            </p>
          )}
          <p
            className={`text-xs ${compact ? "ml-auto" : ""} ${
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

        {/* Add from website */}
        <div className="space-y-1">
          <Label className={`flex items-center gap-1.5 ${compact ? "text-xs" : "text-xs"}`}>
            <Globe className="h-3 w-3" />
            Add from website
          </Label>
          <div className="flex gap-2">
            <Input
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              placeholder="https://example.com/about"
              className={compact ? "h-8 text-sm" : "h-8 text-sm"}
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
              className="h-8 shrink-0"
              disabled={!scrapeUrl.trim() || scraping}
              onClick={() => void handleScrape()}
            >
              {scraping ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Globe className="mr-1 h-3 w-3" />
              )}
              Scrape
            </Button>
          </div>
        </div>

        {/* Upload file */}
        <div className="space-y-1">
          <Label className={`flex items-center gap-1.5 ${compact ? "text-xs" : "text-xs"}`}>
            <Upload className="h-3 w-3" />
            Upload file
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={(e) => void handleFileUpload(e)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 h-3 w-3" />
              Choose .pdf or .txt
            </Button>
            {uploadedFileName && (
              <span className="truncate text-xs text-muted-foreground">
                {uploadedFileName} ({uploadedCharCount.toLocaleString()} chars)
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Max 5 MB. Text is appended to the knowledge base above.
          </p>
        </div>
      </div>

      <Separator />

      {/* FAQ */}
      <div className="space-y-1.5">
        <Label className={compact ? "text-xs" : undefined}>
          Frequently Asked Questions
        </Label>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            Q&A pairs all your AI agents can answer during calls.
          </p>
        )}
        <FAQEditor entries={faq} onChange={setFaq} />
      </div>

      {/* Save */}
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={!isDirty || saving || isOverLimit}
        onClick={handleSave}
      >
        {saving && (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        )}
        Save Business Profile
      </Button>
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[#16a34a]" />
          <h3 className="text-sm font-semibold">Business Profile</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          This profile is injected into all your agents automatically.
        </p>
        {formContent}
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
        <CardContent>{formContent}</CardContent>
      </Card>
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
    const script = document.createElement("script")
    script.src = `${PDFJS_CDN}/pdf.min.mjs`
    script.type = "module"

    // pdf.js ESM doesn't expose to window — use classic build instead
    script.remove()

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
