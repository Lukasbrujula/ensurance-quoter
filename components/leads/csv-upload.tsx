"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ColumnMapper } from "./column-mapper"
import { ImportPreview } from "./import-preview"
import {
  parseCSV,
  autoDetectMapping,
  applyMapping,
  type LeadField,
  type ParsedCSV,
  type ImportResult,
} from "@/lib/utils/csv-parser"
import { useLeadStore } from "@/lib/store/lead-store"
import { createLeadsBatch } from "@/lib/actions/leads"
import { toast } from "sonner"

type Step = "upload" | "map" | "preview" | "done"

export function CSVUpload() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [mapping, setMapping] = useState<Record<string, LeadField>>({})
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addLeads = useLeadStore((s) => s.addLeads)

  const reset = useCallback(() => {
    setStep("upload")
    setParsedCSV(null)
    setMapping({})
    setImportResult(null)
    setIsImporting(false)
    setImportedCount(0)
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) reset()
    },
    [reset]
  )

  /* ---------------------------------------------------------------- */
  /*  Step 1: Upload                                                    */
  /* ---------------------------------------------------------------- */

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv") && !file.name.endsWith(".txt")) {
      toast.error("Please upload a CSV file")
      return
    }

    const parsed = await parseCSV(file)

    if (parsed.headers.length === 0) {
      toast.error("CSV has no columns")
      return
    }

    if (parsed.totalRows === 0) {
      toast.error("CSV has no data rows")
      return
    }

    setParsedCSV(parsed)
    setMapping(autoDetectMapping(parsed.headers))
    setStep("map")

    if (parsed.errors.length > 0) {
      toast.warning(`${parsed.errors.length} rows had parse warnings`)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  /* ---------------------------------------------------------------- */
  /*  Step 2: Map -> Preview                                           */
  /* ---------------------------------------------------------------- */

  function handleConfirmMapping() {
    if (!parsedCSV) return

    const result = applyMapping(parsedCSV.rows, mapping)
    setImportResult(result)
    setStep("preview")
  }

  /* ---------------------------------------------------------------- */
  /*  Step 3: Import                                                   */
  /* ---------------------------------------------------------------- */

  async function handleImport() {
    if (!importResult) return

    setIsImporting(true)

    try {
      const leadsData = importResult.leads.map((mapped) => ({
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email,
        phone: mapped.phone,
        state: mapped.state,
        age: mapped.age,
        gender: mapped.gender,
        tobaccoStatus: mapped.tobaccoStatus,
        dateOfBirth: mapped.dateOfBirth,
        address: mapped.address,
        city: mapped.city,
        zipCode: mapped.zipCode,
        maritalStatus: mapped.maritalStatus,
        occupation: mapped.occupation,
        incomeRange: mapped.incomeRange,
        dependents: mapped.dependents,
        existingCoverage: mapped.existingCoverage,
        notes: mapped.notes,
        source: "csv" as const,
        rawCsvData: mapped.rawCsvData,
      }))

      const result = await createLeadsBatch(leadsData)

      if (result.success && result.data) {
        addLeads(result.data)
        setImportedCount(result.data.length)
        setStep("done")
        toast.success(`${result.data.length} leads imported`)
      } else {
        toast.error(result.error ?? "Failed to import leads")
      }
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setIsImporting(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const mappedFieldCount = Object.values(mapping).filter((f) => f !== "skip").length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        {/* ── Upload ─────────────────────────────────────────────── */}
        {step === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle>Import Leads from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file with lead data. Common formats from lead
                vendors are auto-detected.
              </DialogDescription>
            </DialogHeader>

            <div
              className={`mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag and drop a CSV file here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click below to browse
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </>
        )}

        {/* ── Column Mapping ─────────────────────────────────────── */}
        {step === "map" && parsedCSV && (
          <>
            <DialogHeader>
              <DialogTitle>Map Columns</DialogTitle>
              <DialogDescription>
                {parsedCSV.totalRows} rows detected. Map CSV columns to lead
                fields.
              </DialogDescription>
            </DialogHeader>

            <ColumnMapper
              headers={parsedCSV.headers}
              mapping={mapping}
              onMappingChange={setMapping}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleConfirmMapping}
                disabled={mappedFieldCount === 0}
              >
                Preview Import
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Preview ────────────────────────────────────────────── */}
        {step === "preview" && importResult && (
          <>
            <DialogHeader>
              <DialogTitle>Preview Import</DialogTitle>
              <DialogDescription>
                Review the mapped data before importing.
              </DialogDescription>
            </DialogHeader>

            <ImportPreview result={importResult} />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || importResult.leads.length === 0}
              >
                {isImporting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Import {importResult.leads.length} Leads
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Done ───────────────────────────────────────────────── */}
        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Import Complete</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center py-8">
              <CheckCircle2 className="mb-3 h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">
                {importedCount} leads imported
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Leads are ready in your list
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
