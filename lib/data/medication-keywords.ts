/* ------------------------------------------------------------------ */
/*  Medication & Condition Keyword Detection                            */
/*  Client-side instant matching for live transcript analysis.         */
/*  Maps medications/conditions to carrier eligibility impacts.        */
/* ------------------------------------------------------------------ */

export interface MedicationMatch {
  keyword: string
  condition: string
  severity: "critical" | "warning" | "info"
  carriers: Record<string, string>
}

/**
 * Medications and their carrier impact.
 * Source: carrier intelligence data from lib/data/carriers.ts
 */
export const MEDICATION_KEYWORDS: readonly MedicationMatch[] = [
  {
    keyword: "metformin",
    condition: "Type 2 Diabetes",
    severity: "warning",
    carriers: {
      "John Hancock": "Preferred Diabetic rates",
      "American Amicable": "May decline",
      "Foresters": "May decline",
      "LGA/Banner": "Standard rates",
      "Mutual of Omaha": "Case-by-case",
    },
  },
  {
    keyword: "insulin",
    condition: "Diabetes (Insulin-dependent)",
    severity: "critical",
    carriers: {
      "John Hancock": "Preferred Diabetic rates",
      "American Amicable": "Decline likely",
      "Foresters": "Decline likely",
      "LGA/Banner": "Substandard or decline",
    },
  },
  {
    keyword: "lisinopril",
    condition: "Hypertension",
    severity: "info",
    carriers: {
      "Foresters": "Accept — well-controlled",
      "American Amicable": "Accept — well-controlled",
      "John Hancock": "Preferred possible",
      "LGA/Banner": "Preferred possible",
    },
  },
  {
    keyword: "amlodipine",
    condition: "Hypertension",
    severity: "info",
    carriers: {
      "Foresters": "Accept — well-controlled",
      "John Hancock": "Preferred possible",
    },
  },
  {
    keyword: "atorvastatin",
    condition: "High Cholesterol",
    severity: "info",
    carriers: {
      "Most carriers": "Accept — well-controlled",
      "LGA/Banner": "Preferred Plus possible",
    },
  },
  {
    keyword: "lipitor",
    condition: "High Cholesterol",
    severity: "info",
    carriers: {
      "Most carriers": "Accept — well-controlled",
    },
  },
  {
    keyword: "sertraline",
    condition: "Depression/Anxiety",
    severity: "info",
    carriers: {
      "Most carriers": "Accept if stable",
      "John Hancock": "Preferred possible",
    },
  },
  {
    keyword: "zoloft",
    condition: "Depression/Anxiety",
    severity: "info",
    carriers: {
      "Most carriers": "Accept if stable",
    },
  },
  {
    keyword: "albuterol",
    condition: "Asthma",
    severity: "info",
    carriers: {
      "Most carriers": "Accept — mild/moderate",
      "LGA/Banner": "Preferred possible",
    },
  },
  {
    keyword: "cpap",
    condition: "Sleep Apnea",
    severity: "warning",
    carriers: {
      "John Hancock": "Preferred possible with compliance",
      "Foresters": "Standard rates",
      "American Amicable": "Case-by-case",
    },
  },
  {
    keyword: "warfarin",
    condition: "Blood Clot / A-Fib",
    severity: "critical",
    carriers: {
      "Most carriers": "Substandard — depends on cause",
      "John Hancock": "Case-by-case",
    },
  },
  {
    keyword: "eliquis",
    condition: "Blood Clot / A-Fib",
    severity: "critical",
    carriers: {
      "Most carriers": "Substandard — depends on cause",
    },
  },
  {
    keyword: "chemo",
    condition: "Cancer Treatment",
    severity: "critical",
    carriers: {
      "Most carriers": "Decline during active treatment",
      "American Amicable": "GI product may accept",
    },
  },
  {
    keyword: "chemotherapy",
    condition: "Cancer Treatment",
    severity: "critical",
    carriers: {
      "Most carriers": "Decline during active treatment",
    },
  },
]

/**
 * Condition keywords (not medications, but condition mentions).
 */
export const CONDITION_KEYWORDS: readonly MedicationMatch[] = [
  {
    keyword: "diabetes",
    condition: "Diabetes",
    severity: "warning",
    carriers: {
      "John Hancock": "Most lenient — Preferred Diabetic",
      "LGA/Banner": "Standard rates possible",
    },
  },
  {
    keyword: "cancer",
    condition: "Cancer History",
    severity: "critical",
    carriers: {
      "Most carriers": "Depends on type, stage, and years since treatment",
      "American Amicable": "GI product for recent history",
    },
  },
  {
    keyword: "heart attack",
    condition: "Cardiac Event",
    severity: "critical",
    carriers: {
      "Most carriers": "Substandard or postpone",
      "American Amicable": "GI product may accept",
    },
  },
  {
    keyword: "stroke",
    condition: "Stroke History",
    severity: "critical",
    carriers: {
      "Most carriers": "Substandard or postpone",
    },
  },
  {
    keyword: "bipolar",
    condition: "Bipolar Disorder",
    severity: "warning",
    carriers: {
      "Most carriers": "Case-by-case — stability matters",
      "John Hancock": "More lenient with documented stability",
    },
  },
  {
    keyword: "epilepsy",
    condition: "Epilepsy",
    severity: "warning",
    carriers: {
      "Most carriers": "Accept if controlled 2+ years",
    },
  },
  {
    keyword: "seizure",
    condition: "Seizure History",
    severity: "warning",
    carriers: {
      "Most carriers": "Accept if controlled 2+ years",
    },
  },
  {
    keyword: "copd",
    condition: "COPD",
    severity: "critical",
    carriers: {
      "Most carriers": "Substandard or decline",
      "American Amicable": "GI product may accept",
    },
  },
  {
    keyword: "dui",
    condition: "DUI History",
    severity: "warning",
    carriers: {
      "United Home Life": "DLX product accepts DUI",
      "Transamerica": "Flat extra schedule",
      "Most carriers": "Postpone 3-5 years",
    },
  },
  {
    keyword: "vape",
    condition: "Vaping / Nicotine",
    severity: "info",
    carriers: {
      "Foresters": "Non-smoker rates (only carrier)",
      "John Hancock": "Lenient on nicotine products",
      "Most carriers": "Smoker rates",
    },
  },
  {
    keyword: "nicotine",
    condition: "Nicotine Use",
    severity: "info",
    carriers: {
      "Foresters": "Vaping = non-smoker rates",
      "John Hancock": "Most lenient (ZYN, smokeless, marijuana)",
    },
  },
]

const ALL_KEYWORDS = [...MEDICATION_KEYWORDS, ...CONDITION_KEYWORDS]

/**
 * Scan a transcript chunk for medication/condition keywords.
 * Returns deduplicated matches (by condition, not keyword).
 */
export function detectMedications(text: string): MedicationMatch[] {
  const lower = text.toLowerCase()
  const seen = new Set<string>()
  const matches: MedicationMatch[] = []

  for (const entry of ALL_KEYWORDS) {
    if (lower.includes(entry.keyword) && !seen.has(entry.condition)) {
      seen.add(entry.condition)
      matches.push(entry)
    }
  }

  return matches
}
