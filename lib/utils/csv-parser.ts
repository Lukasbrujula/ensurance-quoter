import Papa from "papaparse"
import type { MaritalStatus, IncomeRange } from "@/lib/types/lead"

/* ------------------------------------------------------------------ */
/*  Lead field definitions for column mapping                          */
/* ------------------------------------------------------------------ */

export type LeadField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "state"
  | "age"
  | "gender"
  | "tobaccoStatus"
  | "dateOfBirth"
  | "address"
  | "city"
  | "zipCode"
  | "maritalStatus"
  | "occupation"
  | "incomeRange"
  | "dependents"
  | "existingCoverage"
  | "notes"
  | "skip"

export interface LeadFieldOption {
  value: LeadField
  label: string
}

export const LEAD_FIELDS: LeadFieldOption[] = [
  { value: "skip", label: "Skip (don't import)" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "state", label: "State" },
  { value: "age", label: "Age" },
  { value: "gender", label: "Gender" },
  { value: "tobaccoStatus", label: "Tobacco Status" },
  { value: "dateOfBirth", label: "Date of Birth" },
  { value: "address", label: "Address" },
  { value: "city", label: "City" },
  { value: "zipCode", label: "Zip Code" },
  { value: "maritalStatus", label: "Marital Status" },
  { value: "occupation", label: "Occupation" },
  { value: "incomeRange", label: "Income Range" },
  { value: "dependents", label: "Dependents" },
  { value: "existingCoverage", label: "Existing Coverage" },
  { value: "notes", label: "Notes" },
]

/* ------------------------------------------------------------------ */
/*  Auto-detect column mapping from header names                       */
/* ------------------------------------------------------------------ */

const COLUMN_ALIASES: Record<string, LeadField> = {
  // Existing fields
  first_name: "firstName",
  firstname: "firstName",
  "first name": "firstName",
  fname: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  "last name": "lastName",
  lname: "lastName",
  email: "email",
  email_address: "email",
  "email address": "email",
  phone: "phone",
  phone_number: "phone",
  "phone number": "phone",
  mobile: "phone",
  cell: "phone",
  state: "state",
  st: "state",
  region: "state",
  age: "age",
  gender: "gender",
  sex: "gender",
  tobacco: "tobaccoStatus",
  tobacco_status: "tobaccoStatus",
  smoker: "tobaccoStatus",
  // Phase 6: personal/contact
  dob: "dateOfBirth",
  "date of birth": "dateOfBirth",
  date_of_birth: "dateOfBirth",
  birthday: "dateOfBirth",
  "birth date": "dateOfBirth",
  birth_date: "dateOfBirth",
  birthdate: "dateOfBirth",
  address: "address",
  street: "address",
  "street address": "address",
  street_address: "address",
  "address line 1": "address",
  addr: "address",
  city: "city",
  town: "city",
  municipality: "city",
  zip: "zipCode",
  "zip code": "zipCode",
  zip_code: "zipCode",
  zipcode: "zipCode",
  "postal code": "zipCode",
  postal_code: "zipCode",
  postal: "zipCode",
  "marital status": "maritalStatus",
  marital_status: "maritalStatus",
  marital: "maritalStatus",
  "marriage status": "maritalStatus",
  // Phase 6: financial/professional
  occupation: "occupation",
  job: "occupation",
  "job title": "occupation",
  job_title: "occupation",
  title: "occupation",
  position: "occupation",
  employment: "occupation",
  income: "incomeRange",
  "income range": "incomeRange",
  income_range: "incomeRange",
  salary: "incomeRange",
  "salary range": "incomeRange",
  "annual income": "incomeRange",
  annual_income: "incomeRange",
  "household income": "incomeRange",
  dependents: "dependents",
  deps: "dependents",
  "number of dependents": "dependents",
  children: "dependents",
  kids: "dependents",
  "existing coverage": "existingCoverage",
  existing_coverage: "existingCoverage",
  "current coverage": "existingCoverage",
  "existing insurance": "existingCoverage",
  "current policy": "existingCoverage",
  "coverage in force": "existingCoverage",
  // Phase 6: notes
  notes: "notes",
  comments: "notes",
  remarks: "notes",
  memo: "notes",
  "agent notes": "notes",
  agent_notes: "notes",
}

export function autoDetectMapping(headers: string[]): Record<string, LeadField> {
  const mapping: Record<string, LeadField> = {}

  const usedFields = new Set<LeadField>()

  for (const header of headers) {
    const normalized = header.toLowerCase().trim()
    const match = COLUMN_ALIASES[normalized]
    if (match && !usedFields.has(match)) {
      mapping[header] = match
      usedFields.add(match)
    } else {
      mapping[header] = "skip"
    }
  }

  return mapping
}

/* ------------------------------------------------------------------ */
/*  Parse CSV file                                                     */
/* ------------------------------------------------------------------ */

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
  errors: string[]
}

export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve) => {
    const errors: string[] = []

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        for (const err of results.errors) {
          errors.push(`Row ${err.row}: ${err.message}`)
        }

        const rows = results.data as Record<string, string>[]
        const headers = results.meta.fields ?? []

        resolve({
          headers,
          rows,
          totalRows: rows.length,
          errors,
        })
      },
    })
  })
}

/* ------------------------------------------------------------------ */
/*  Normalization helpers                                              */
/* ------------------------------------------------------------------ */

function normalizeGender(value: string): "Male" | "Female" | null {
  const lower = value.toLowerCase().trim()
  if (lower === "m" || lower === "male") return "Male"
  if (lower === "f" || lower === "female") return "Female"
  return null
}

function normalizeTobacco(value: string): "non-smoker" | "smoker" | null {
  const lower = value.toLowerCase().trim()
  if (lower === "yes" || lower === "true" || lower === "smoker" || lower === "y" || lower === "1") return "smoker"
  if (lower === "no" || lower === "false" || lower === "non-smoker" || lower === "n" || lower === "0") return "non-smoker"
  return null
}

function parseAge(value: string): number | null {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 0 || num > 150) return null
  return num
}

function normalizeMaritalStatus(value: string): MaritalStatus | null {
  const lower = value.toLowerCase().trim()
  if (lower === "s" || lower === "single") return "single"
  if (lower === "m" || lower === "married") return "married"
  if (lower === "d" || lower === "divorced") return "divorced"
  if (lower === "w" || lower === "widowed") return "widowed"
  if (lower === "dp" || lower === "domestic partner" || lower === "domestic_partner") return "domestic_partner"
  return null
}

function normalizeIncomeRange(value: string): IncomeRange | null {
  const cleaned = value.replace(/[$,\s]/g, "").toLowerCase()

  // Direct enum match
  const directMap: Record<string, IncomeRange> = {
    under_25k: "under_25k",
    "25k_50k": "25k_50k",
    "50k_75k": "50k_75k",
    "75k_100k": "75k_100k",
    "100k_150k": "100k_150k",
    "150k_250k": "150k_250k",
    over_250k: "over_250k",
  }
  if (directMap[cleaned]) return directMap[cleaned]

  // Range strings like "75k-100k" or "75000-100000"
  const rangeMatch = cleaned.match(/^(\d+)k?\s*[-–]\s*(\d+)k?$/)
  if (rangeMatch) {
    let low = parseInt(rangeMatch[1], 10)
    let high = parseInt(rangeMatch[2], 10)
    // Adjust for "k" suffix: if values < 1000, assume thousands
    if (low < 1000) low *= 1000
    if (high < 1000) high *= 1000
    return bucketIncome((low + high) / 2)
  }

  // Single number like "50000" or "75k"
  const numMatch = cleaned.match(/^(\d+)k?$/)
  if (numMatch) {
    let amount = parseInt(numMatch[1], 10)
    if (amount < 1000) amount *= 1000
    return bucketIncome(amount)
  }

  return null
}

function bucketIncome(amount: number): IncomeRange {
  if (amount < 25000) return "under_25k"
  if (amount < 50000) return "25k_50k"
  if (amount < 75000) return "50k_75k"
  if (amount < 100000) return "75k_100k"
  if (amount < 150000) return "100k_150k"
  if (amount < 250000) return "150k_250k"
  return "over_250k"
}

function parseDateOfBirth(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  // Try ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return trimmed
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    const d = new Date(iso)
    if (!isNaN(d.getTime())) return iso
  }

  // M/D/YY (2-digit year)
  const mdyShortMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/)
  if (mdyShortMatch) {
    const [, month, day, yearShort] = mdyShortMatch
    const yearNum = parseInt(yearShort, 10)
    // 2-digit year: 00-29 → 2000s, 30-99 → 1900s
    const year = yearNum < 30 ? 2000 + yearNum : 1900 + yearNum
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    const d = new Date(iso)
    if (!isNaN(d.getTime())) return iso
  }

  return null
}

function normalizeZipCode(value: string): string | null {
  const cleaned = value.replace(/\s/g, "")
  // 5-digit zip
  if (/^\d{5}$/.test(cleaned)) return cleaned
  // 9-digit zip with dash
  if (/^\d{5}-\d{4}$/.test(cleaned)) return cleaned
  // 9-digit zip without dash — add dash
  if (/^\d{9}$/.test(cleaned)) return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
  // Extract 5-digit if present
  const fiveMatch = cleaned.match(/^(\d{5})/)
  if (fiveMatch) return fiveMatch[1]
  return null
}

function parseDependents(value: string): number | null {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 0) return null
  return Math.min(num, 20)
}

/* ------------------------------------------------------------------ */
/*  Apply mapping to produce lead data                                 */
/* ------------------------------------------------------------------ */

export interface MappedLead {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  state: string | null
  age: number | null
  gender: "Male" | "Female" | null
  tobaccoStatus: "non-smoker" | "smoker" | null
  dateOfBirth: string | null
  address: string | null
  city: string | null
  zipCode: string | null
  maritalStatus: MaritalStatus | null
  occupation: string | null
  incomeRange: IncomeRange | null
  dependents: number | null
  existingCoverage: string | null
  notes: string | null
  rawCsvData: Record<string, string>
}

export interface ImportResult {
  leads: MappedLead[]
  skipped: { row: number; reason: string }[]
  duplicateEmails: string[]
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<string, LeadField>
): ImportResult {
  const leads: MappedLead[] = []
  const skipped: { row: number; reason: string }[] = []
  const seenEmails = new Set<string>()
  const duplicateEmails: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lead: MappedLead = {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      state: null,
      age: null,
      gender: null,
      tobaccoStatus: null,
      dateOfBirth: null,
      address: null,
      city: null,
      zipCode: null,
      maritalStatus: null,
      occupation: null,
      incomeRange: null,
      dependents: null,
      existingCoverage: null,
      notes: null,
      rawCsvData: row,
    }

    let hasAnyData = false

    for (const [csvCol, leadField] of Object.entries(mapping)) {
      if (leadField === "skip") continue
      const value = row[csvCol]?.trim()
      if (!value) continue

      hasAnyData = true

      switch (leadField) {
        case "firstName":
          lead.firstName = value
          break
        case "lastName":
          lead.lastName = value
          break
        case "email":
          lead.email = value.toLowerCase()
          break
        case "phone":
          lead.phone = value
          break
        case "state":
          lead.state = value.length === 2 ? value.toUpperCase() : value
          break
        case "age":
          lead.age = parseAge(value)
          break
        case "gender":
          lead.gender = normalizeGender(value)
          break
        case "tobaccoStatus":
          lead.tobaccoStatus = normalizeTobacco(value)
          break
        case "dateOfBirth":
          lead.dateOfBirth = parseDateOfBirth(value)
          break
        case "address":
          lead.address = value
          break
        case "city":
          lead.city = value
          break
        case "zipCode":
          lead.zipCode = normalizeZipCode(value)
          break
        case "maritalStatus":
          lead.maritalStatus = normalizeMaritalStatus(value)
          break
        case "occupation":
          lead.occupation = value
          break
        case "incomeRange":
          lead.incomeRange = normalizeIncomeRange(value)
          break
        case "dependents":
          lead.dependents = parseDependents(value)
          break
        case "existingCoverage":
          lead.existingCoverage = value
          break
        case "notes":
          lead.notes = value
          break
      }
    }

    if (!hasAnyData) {
      skipped.push({ row: i + 1, reason: "Empty row" })
      continue
    }

    // Auto-calculate age from DOB if no explicit age mapped
    if (lead.dateOfBirth && lead.age === null) {
      const dob = new Date(lead.dateOfBirth)
      if (!isNaN(dob.getTime())) {
        const today = new Date()
        let age = today.getFullYear() - dob.getFullYear()
        const md = today.getMonth() - dob.getMonth()
        if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--
        if (age >= 0 && age <= 150) lead.age = age
      }
    }

    if (lead.email) {
      const emailLower = lead.email.toLowerCase()
      if (seenEmails.has(emailLower)) {
        duplicateEmails.push(emailLower)
      }
      seenEmails.add(emailLower)
    }

    leads.push(lead)
  }

  return { leads, skipped, duplicateEmails }
}
