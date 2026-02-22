import { NextResponse } from "next/server"
import { enrichmentLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import type {
  EnrichmentResponse,
  EnrichmentExperience,
  EnrichmentEducation,
  EnrichmentStreetAddress,
  EnrichmentProfile,
  EnrichmentPhone,
  EnrichmentEmailRecord,
  EnrichmentCertification,
  EnrichmentLanguage,
  EnrichmentJobHistory,
} from "@/lib/types"

interface EnrichmentRequest {
  name?: string
  email?: string
  phone?: string
  profile?: string
}

/* ------------------------------------------------------------------ */
/*  Safe extraction helpers (PDL returns booleans on free plans)        */
/* ------------------------------------------------------------------ */

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function safeBool(value: unknown): boolean {
  return value === true
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === "string" && v.length > 0)
}

function calculateAge(birthDate: string | null, birthYear: number | null): number | null {
  const year = birthDate ? parseInt(birthDate.slice(0, 4), 10) : birthYear
  if (!year || !Number.isFinite(year)) return null
  const age = new Date().getFullYear() - year
  return age > 0 && age < 150 ? age : null
}

function estimateAgeFromEducation(
  education: EnrichmentEducation[],
): { age: number; estimated: true } | null {
  for (const edu of education) {
    if (edu.startDate) {
      const year = parseInt(edu.startDate.slice(0, 4), 10)
      if (Number.isFinite(year) && year > 1940 && year < 2030) {
        const age = new Date().getFullYear() - (year - 18)
        if (age > 0 && age < 150) return { age, estimated: true }
      }
    }
    if (edu.endDate) {
      const year = parseInt(edu.endDate.slice(0, 4), 10)
      if (Number.isFinite(year) && year > 1940 && year < 2030) {
        const age = new Date().getFullYear() - (year - 22)
        if (age > 0 && age < 150) return { age, estimated: true }
      }
    }
  }
  return null
}

/* ------------------------------------------------------------------ */
/*  Complex object extractors                                          */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractExperience(raw: any): EnrichmentExperience[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((exp: any) => ({
    company: safeString(exp?.company?.name),
    companySize: safeString(exp?.company?.size),
    companyIndustry: safeString(exp?.company?.industry),
    companyFounded: safeNumber(exp?.company?.founded),
    companyType: safeString(exp?.company?.type),
    companyLocation: safeString(exp?.company?.location?.name),
    companyWebsite: safeString(exp?.company?.website),
    title: safeString(exp?.title?.name),
    titleRole: safeString(exp?.title?.role),
    titleSubRole: safeString(exp?.title?.sub_role),
    titleLevels: safeStringArray(exp?.title?.levels),
    startDate: safeString(exp?.start_date),
    endDate: safeString(exp?.end_date),
    isPrimary: safeBool(exp?.is_primary),
    summary: safeString(exp?.summary),
    locationNames: safeStringArray(exp?.location_names),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEducation(raw: any): EnrichmentEducation[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((edu: any) => ({
    name: safeString(edu?.school?.name),
    type: safeString(edu?.school?.type),
    location: safeString(edu?.school?.location?.name),
    website: safeString(edu?.school?.website),
    linkedinUrl: safeString(edu?.school?.linkedin_url),
    degrees: safeStringArray(edu?.degrees),
    startDate: safeString(edu?.start_date),
    endDate: safeString(edu?.end_date),
    majors: safeStringArray(edu?.majors),
    minors: safeStringArray(edu?.minors),
    gpa: safeNumber(edu?.gpa),
    summary: safeString(edu?.summary),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStreetAddresses(raw: any): EnrichmentStreetAddress[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.filter((a: any) => typeof a === "object" && a !== null).map((a: any) => ({
    name: safeString(a?.name),
    locality: safeString(a?.locality),
    region: safeString(a?.region),
    country: safeString(a?.country),
    streetAddress: safeString(a?.street_address),
    addressLine2: safeString(a?.address_line_2),
    postalCode: safeString(a?.postal_code),
    geo: safeString(a?.geo),
    continent: safeString(a?.continent),
    firstSeen: safeString(a?.first_seen),
    lastSeen: safeString(a?.last_seen),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractProfiles(raw: any): EnrichmentProfile[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.filter((p: any) => typeof p === "object" && p !== null).map((p: any) => ({
    network: safeString(p?.network),
    url: safeString(p?.url),
    username: safeString(p?.username),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPhones(raw: any): EnrichmentPhone[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.filter((p: any) => typeof p === "object" && p !== null).map((p: any) => ({
    number: safeString(p?.number),
    firstSeen: safeString(p?.first_seen),
    lastSeen: safeString(p?.last_seen),
    numSources: safeNumber(p?.num_sources),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEmailRecords(raw: any): EnrichmentEmailRecord[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.filter((e: any) => typeof e === "object" && e !== null).map((e: any) => ({
    address: safeString(e?.address),
    type: safeString(e?.type),
    firstSeen: safeString(e?.first_seen),
    lastSeen: safeString(e?.last_seen),
    numSources: safeNumber(e?.num_sources),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCertifications(raw: any): EnrichmentCertification[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.filter((c: any) => typeof c === "object" && c !== null).map((c: any) => ({
    name: safeString(c?.name),
    organization: safeString(c?.organization),
    startDate: safeString(c?.start_date),
    endDate: safeString(c?.end_date),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLanguages(raw: any): EnrichmentLanguage[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.filter((l: any) => typeof l === "object" && l !== null).map((l: any) => ({
    name: safeString(l?.name),
    proficiency: safeNumber(l?.proficiency),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJobHistory(raw: any): EnrichmentJobHistory[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.filter((j: any) => typeof j === "object" && j !== null).map((j: any) => ({
    companyName: safeString(j?.company_name),
    title: safeString(j?.title),
    firstSeen: safeString(j?.first_seen),
    lastSeen: safeString(j?.last_seen),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPhoneNumbers(raw: any): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((p: unknown) => (typeof p === "string" ? p : null))
    .filter((num: unknown): num is string => typeof num === "string")
}

/* ------------------------------------------------------------------ */
/*  Strip boolean-gated values from raw data for cleaner AI context    */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanRawData(data: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "boolean") continue
    if (value === null || value === undefined) continue
    if (Array.isArray(value) && value.length === 0) continue
    cleaned[key] = value
  }
  return cleaned
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const rl = enrichmentLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const apiKey = process.env.PEOPLEDATALABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "PEOPLEDATALABS_API_KEY not configured" },
        { status: 500 },
      )
    }

    const body = (await request.json()) as EnrichmentRequest

    const hasMinimumInput =
      body.email ||
      body.phone ||
      body.profile ||
      (body.name && (body.email || body.phone))

    if (!hasMinimumInput) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum required: email, phone, LinkedIn URL, or name with email/phone",
        },
        { status: 400 },
      )
    }

    const params = new URLSearchParams()
    if (body.name) params.set("name", body.name)
    if (body.email) params.set("email", body.email)
    if (body.phone) params.set("phone", body.phone)
    if (body.profile) params.set("profile", body.profile)

    const pdlResponse = await fetch(
      `https://api.peopledatalabs.com/v5/person/enrich?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
      },
    )

    const pdlData = await pdlResponse.json()

    if (pdlData.status === 404 || !pdlData.data) {
      return NextResponse.json(
        { success: false, error: "No matching person found" },
        { status: 404 },
      )
    }

    if (pdlData.status !== 200) {
      return NextResponse.json(
        {
          success: false,
          error: pdlData.error?.message ?? `People Data Labs API error (${pdlData.status})`,
        },
        { status: 502 },
      )
    }

    const p = pdlData.data
    const birthDate = safeString(p.birth_date)
    const birthYear = safeNumber(p.birth_year)
    const education = extractEducation(p.education)
    const directAge = calculateAge(birthDate, birthYear)
    const ageEstimate = !directAge ? estimateAgeFromEducation(education) : null

    const response: EnrichmentResponse = {
      success: true,
      data: {
        // ── Identity
        fullName: safeString(p.full_name),
        firstName: safeString(p.first_name),
        middleName: safeString(p.middle_name),
        lastName: safeString(p.last_name),
        birthDate,
        birthYear,
        age: directAge ?? ageEstimate?.age ?? null,
        ageEstimated: ageEstimate !== null,
        sex: safeString(p.sex),
        nameAliases: safeStringArray(p.name_aliases),
        summary: safeString(p.summary),
        headline: safeString(p.headline),

        // ── Location (current)
        locationName: safeString(p.location_name),
        city: safeString(p.location_locality),
        state: safeString(p.location_region),
        zip: safeString(p.location_postal_code),
        country: safeString(p.location_country),
        continent: safeString(p.location_continent),
        locationStreetAddress: safeString(p.location_street_address),
        locationAddressLine2: safeString(p.location_address_line_2),
        locationGeo: safeString(p.location_geo),

        // ── Location (history)
        locationNames: safeStringArray(p.location_names),
        regions: safeStringArray(p.regions),
        countries: safeStringArray(p.countries),
        streetAddresses: extractStreetAddresses(p.street_addresses),
        possibleLocationNames: safeStringArray(p.possible_location_names),
        possibleStreetAddresses: extractStreetAddresses(p.possible_street_addresses),

        // ── Current Employment
        jobTitle: safeString(p.job_title),
        jobTitleRole: safeString(p.job_title_role),
        jobTitleSubRole: safeString(p.job_title_sub_role),
        jobTitleClass: safeString(p.job_title_class),
        jobTitleLevels: safeStringArray(p.job_title_levels),
        jobCompanyName: safeString(p.job_company_name),
        jobCompanyId: safeString(p.job_company_id),
        jobCompanyWebsite: safeString(p.job_company_website),
        jobCompanyFounded: safeNumber(p.job_company_founded),
        jobCompanyLinkedinUrl: safeString(p.job_company_linkedin_url),
        jobCompanyType: safeString(p.job_company_type),
        jobCompanyTicker: safeString(p.job_company_ticker),
        jobCompanyLocationName: safeString(p.job_company_location_name),
        jobCompanySize: safeString(p.job_company_size),
        jobCompanyEmployeeCount: safeNumber(p.job_company_employee_count),
        jobCompanyInferredRevenue: safeString(p.job_company_inferred_revenue),
        jobCompanyIndustry: safeString(p.job_company_industry),
        jobCompany12moGrowthRate: safeNumber(p.job_company_12mo_employee_growth_rate),
        jobCompanyTotalFundingRaised: safeNumber(p.job_company_total_funding_raised),
        jobStartDate: safeString(p.job_start_date),
        jobLastChanged: safeString(p.job_last_changed),
        jobLastVerified: safeString(p.job_last_verified),
        jobSummary: safeString(p.job_summary),
        industry: safeString(p.industry),

        // ── Income & Career
        inferredSalary: safeString(p.inferred_salary),
        inferredYearsExperience: safeNumber(p.inferred_years_experience),

        // ── Experience (full history)
        experience: extractExperience(p.experience),
        jobHistory: extractJobHistory(p.job_history),

        // ── Education (full)
        education,

        // ── Skills & Certifications
        skills: safeStringArray(p.skills),
        interests: safeStringArray(p.interests),
        certifications: extractCertifications(p.certifications),
        languages: extractLanguages(p.languages),

        // ── Contact
        workEmail: safeString(p.work_email),
        personalEmails: safeStringArray(p.personal_emails),
        recommendedPersonalEmail: safeString(p.recommended_personal_email),
        emails: extractEmailRecords(p.emails),
        possibleEmails: extractEmailRecords(p.possible_emails),
        mobilePhone: safeString(p.mobile_phone),
        phoneNumbers: extractPhoneNumbers(p.phone_numbers),
        phones: extractPhones(p.phones),
        possiblePhones: extractPhones(p.possible_phones),

        // ── Social Profiles
        linkedinUrl: safeString(p.linkedin_url),
        linkedinUsername: safeString(p.linkedin_username),
        linkedinId: safeString(p.linkedin_id),
        linkedinConnections: safeNumber(p.linkedin_connections),
        facebookUrl: safeString(p.facebook_url),
        facebookUsername: safeString(p.facebook_username),
        facebookId: safeString(p.facebook_id),
        facebookFriends: safeNumber(p.facebook_friends),
        twitterUrl: safeString(p.twitter_url),
        twitterUsername: safeString(p.twitter_username),
        githubUrl: safeString(p.github_url),
        githubUsername: safeString(p.github_username),
        profiles: extractProfiles(p.profiles),
        possibleProfiles: extractProfiles(p.possible_profiles),

        // ── Metadata
        numSources: safeNumber(p.num_sources),
        numRecords: safeNumber(p.num_records),
        firstSeen: safeString(p.first_seen),

        // ── Raw (cleaned of booleans/nulls for AI)
        rawData: cleanRawData(p),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enrichment request failed"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
