/* ------------------------------------------------------------------ */
/*  Proactive Insights                                                 */
/* ------------------------------------------------------------------ */

export interface ProactiveInsight {
  id: string
  type: "warning" | "tip" | "info"
  title: string
  body: string
}

export interface ProactiveInsightsResponse {
  insights: ProactiveInsight[]
}

/* ------------------------------------------------------------------ */
/*  PDL Enrichment — Sub-types                                         */
/* ------------------------------------------------------------------ */

export interface EnrichmentStreetAddress {
  name: string | null
  locality: string | null
  region: string | null
  country: string | null
  streetAddress: string | null
  addressLine2: string | null
  postalCode: string | null
  geo: string | null
  continent: string | null
  firstSeen: string | null
  lastSeen: string | null
}

export interface EnrichmentExperience {
  company: string | null
  companySize: string | null
  companyIndustry: string | null
  companyFounded: number | null
  companyType: string | null
  companyLocation: string | null
  companyWebsite: string | null
  title: string | null
  titleRole: string | null
  titleSubRole: string | null
  titleLevels: string[]
  startDate: string | null
  endDate: string | null
  isPrimary: boolean
  summary: string | null
  locationNames: string[]
}

export interface EnrichmentEducation {
  name: string | null
  type: string | null
  location: string | null
  website: string | null
  linkedinUrl: string | null
  degrees: string[]
  startDate: string | null
  endDate: string | null
  majors: string[]
  minors: string[]
  gpa: number | null
  summary: string | null
}

export interface EnrichmentProfile {
  network: string | null
  url: string | null
  username: string | null
}

export interface EnrichmentPhone {
  number: string | null
  firstSeen: string | null
  lastSeen: string | null
  numSources: number | null
}

export interface EnrichmentEmailRecord {
  address: string | null
  type: string | null
  firstSeen: string | null
  lastSeen: string | null
  numSources: number | null
}

export interface EnrichmentCertification {
  name: string | null
  organization: string | null
  startDate: string | null
  endDate: string | null
}

export interface EnrichmentLanguage {
  name: string | null
  proficiency: number | null
}

export interface EnrichmentJobHistory {
  companyName: string | null
  title: string | null
  firstSeen: string | null
  lastSeen: string | null
}

/* ------------------------------------------------------------------ */
/*  PDL Enrichment — Main Result                                       */
/* ------------------------------------------------------------------ */

export interface EnrichmentResult {
  // ── Identity ────────────────────────────────────────────────────
  fullName: string | null
  firstName: string | null
  middleName: string | null
  lastName: string | null
  birthDate: string | null
  birthYear: number | null
  age: number | null
  ageEstimated: boolean
  sex: string | null
  nameAliases: string[]
  summary: string | null
  headline: string | null

  // ── Location (current) ─────────────────────────────────────────
  locationName: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  continent: string | null
  locationStreetAddress: string | null
  locationAddressLine2: string | null
  locationGeo: string | null

  // ── Location (history) ─────────────────────────────────────────
  locationNames: string[]
  regions: string[]
  countries: string[]
  streetAddresses: EnrichmentStreetAddress[]
  possibleLocationNames: string[]
  possibleStreetAddresses: EnrichmentStreetAddress[]

  // ── Current Employment ─────────────────────────────────────────
  jobTitle: string | null
  jobTitleRole: string | null
  jobTitleSubRole: string | null
  jobTitleClass: string | null
  jobTitleLevels: string[]
  jobCompanyName: string | null
  jobCompanyId: string | null
  jobCompanyWebsite: string | null
  jobCompanyFounded: number | null
  jobCompanyLinkedinUrl: string | null
  jobCompanyType: string | null
  jobCompanyTicker: string | null
  jobCompanyLocationName: string | null
  jobCompanySize: string | null
  jobCompanyEmployeeCount: number | null
  jobCompanyInferredRevenue: string | null
  jobCompanyIndustry: string | null
  jobCompany12moGrowthRate: number | null
  jobCompanyTotalFundingRaised: number | null
  jobStartDate: string | null
  jobLastChanged: string | null
  jobLastVerified: string | null
  jobSummary: string | null
  industry: string | null

  // ── Income & Career ────────────────────────────────────────────
  inferredSalary: string | null
  inferredYearsExperience: number | null

  // ── Experience (full history) ──────────────────────────────────
  experience: EnrichmentExperience[]
  jobHistory: EnrichmentJobHistory[]

  // ── Education (full) ───────────────────────────────────────────
  education: EnrichmentEducation[]

  // ── Skills & Certifications ────────────────────────────────────
  skills: string[]
  interests: string[]
  certifications: EnrichmentCertification[]
  languages: EnrichmentLanguage[]

  // ── Contact ────────────────────────────────────────────────────
  workEmail: string | null
  personalEmails: string[]
  recommendedPersonalEmail: string | null
  emails: EnrichmentEmailRecord[]
  possibleEmails: EnrichmentEmailRecord[]
  mobilePhone: string | null
  phoneNumbers: string[]
  phones: EnrichmentPhone[]
  possiblePhones: EnrichmentPhone[]

  // ── Social Profiles ────────────────────────────────────────────
  linkedinUrl: string | null
  linkedinUsername: string | null
  linkedinId: string | null
  linkedinConnections: number | null
  facebookUrl: string | null
  facebookUsername: string | null
  facebookId: string | null
  facebookFriends: number | null
  twitterUrl: string | null
  twitterUsername: string | null
  githubUrl: string | null
  githubUsername: string | null
  profiles: EnrichmentProfile[]
  possibleProfiles: EnrichmentProfile[]

  // ── Metadata ───────────────────────────────────────────────────
  numSources: number | null
  numRecords: number | null
  firstSeen: string | null

  // ── Raw PDL response (for AI consumption) ──────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData: Record<string, any> | null
}

/* ------------------------------------------------------------------ */
/*  Auto-fill & Response wrapper                                       */
/* ------------------------------------------------------------------ */

export interface EnrichmentAutoFillData {
  firstName?: string
  lastName?: string
  age?: number
  gender?: "Male" | "Female"
  state?: string
  dateOfBirth?: string
  address?: string
  city?: string
  zipCode?: string
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | "domestic_partner"
  occupation?: string
  incomeRange?: "under_25k" | "25k_50k" | "50k_75k" | "75k_100k" | "100k_150k" | "150k_250k" | "over_250k"
  dependents?: number
  existingCoverage?: string
}

export interface EnrichmentResponse {
  success: boolean
  data?: EnrichmentResult
  error?: string
}
