/**
 * Build charts (height/weight limits) per carrier.
 *
 * Each entry maps a height (in total inches) to max weight thresholds
 * for Preferred and Standard rate classes. Weights above the Standard
 * max result in a decline. Carriers without build chart data are not
 * listed — the engine treats them as "no restrictions."
 *
 * Data is gender-specific where carriers differentiate (most do).
 * Heights cover 58″ (4'10") through 78″ (6'6").
 */

import type { Gender } from "@/lib/types"

export interface BuildChartEntry {
  heightInches: number
  maxWeightPreferred: number
  maxWeightStandard: number
}

export interface CarrierBuildChart {
  carrierId: string
  male: BuildChartEntry[]
  female: BuildChartEntry[]
}

/**
 * Standard height range: 58″ (4'10") to 78″ (6'6")
 * Generates entries with linear interpolation between anchor weights.
 */
function generateEntries(
  anchors: Array<{ h: number; pref: number; std: number }>,
): BuildChartEntry[] {
  const entries: BuildChartEntry[] = []
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]!
    const b = anchors[i + 1]!
    for (let h = a.h; h < b.h; h++) {
      const t = (h - a.h) / (b.h - a.h)
      entries.push({
        heightInches: h,
        maxWeightPreferred: Math.round(a.pref + t * (b.pref - a.pref)),
        maxWeightStandard: Math.round(a.std + t * (b.std - a.std)),
      })
    }
  }
  const last = anchors[anchors.length - 1]!
  entries.push({
    heightInches: last.h,
    maxWeightPreferred: last.pref,
    maxWeightStandard: last.std,
  })
  return entries
}

// -------------------------------------------------------------------
// LGA / Banner Life — strict Preferred, generous Standard
// -------------------------------------------------------------------
const lgaMale = generateEntries([
  { h: 58, pref: 130, std: 155 },
  { h: 62, pref: 148, std: 175 },
  { h: 66, pref: 170, std: 205 },
  { h: 70, pref: 195, std: 235 },
  { h: 74, pref: 220, std: 270 },
  { h: 78, pref: 250, std: 305 },
])

const lgaFemale = generateEntries([
  { h: 58, pref: 120, std: 145 },
  { h: 62, pref: 135, std: 165 },
  { h: 66, pref: 155, std: 190 },
  { h: 70, pref: 180, std: 220 },
  { h: 74, pref: 205, std: 255 },
  { h: 78, pref: 235, std: 290 },
])

// -------------------------------------------------------------------
// SBLI — moderate limits, all 6 rate classes
// -------------------------------------------------------------------
const sbliMale = generateEntries([
  { h: 58, pref: 135, std: 165 },
  { h: 62, pref: 152, std: 185 },
  { h: 66, pref: 175, std: 215 },
  { h: 70, pref: 200, std: 245 },
  { h: 74, pref: 228, std: 280 },
  { h: 78, pref: 258, std: 315 },
])

const sbliFemale = generateEntries([
  { h: 58, pref: 125, std: 155 },
  { h: 62, pref: 140, std: 175 },
  { h: 66, pref: 160, std: 200 },
  { h: 70, pref: 185, std: 230 },
  { h: 74, pref: 212, std: 265 },
  { h: 78, pref: 242, std: 300 },
])

// -------------------------------------------------------------------
// Mutual of Omaha — generous limits
// -------------------------------------------------------------------
const mooMale = generateEntries([
  { h: 58, pref: 140, std: 170 },
  { h: 62, pref: 158, std: 192 },
  { h: 66, pref: 182, std: 222 },
  { h: 70, pref: 208, std: 255 },
  { h: 74, pref: 237, std: 290 },
  { h: 78, pref: 268, std: 328 },
])

const mooFemale = generateEntries([
  { h: 58, pref: 130, std: 160 },
  { h: 62, pref: 145, std: 180 },
  { h: 66, pref: 168, std: 208 },
  { h: 70, pref: 193, std: 240 },
  { h: 74, pref: 222, std: 275 },
  { h: 78, pref: 252, std: 312 },
])

// -------------------------------------------------------------------
// NLG / LSW — BMI-based rate classes (6 tiers)
// -------------------------------------------------------------------
const nlgMale = generateEntries([
  { h: 58, pref: 132, std: 168 },
  { h: 62, pref: 150, std: 190 },
  { h: 66, pref: 172, std: 218 },
  { h: 70, pref: 198, std: 250 },
  { h: 74, pref: 225, std: 285 },
  { h: 78, pref: 256, std: 322 },
])

const nlgFemale = generateEntries([
  { h: 58, pref: 122, std: 158 },
  { h: 62, pref: 138, std: 178 },
  { h: 66, pref: 158, std: 205 },
  { h: 70, pref: 182, std: 235 },
  { h: 74, pref: 210, std: 270 },
  { h: 78, pref: 240, std: 308 },
])

// -------------------------------------------------------------------
// Foresters — moderate limits
// -------------------------------------------------------------------
const forestersMale = generateEntries([
  { h: 58, pref: 133, std: 162 },
  { h: 62, pref: 150, std: 183 },
  { h: 66, pref: 174, std: 212 },
  { h: 70, pref: 200, std: 243 },
  { h: 74, pref: 228, std: 278 },
  { h: 78, pref: 258, std: 315 },
])

const forestersFemale = generateEntries([
  { h: 58, pref: 123, std: 152 },
  { h: 62, pref: 138, std: 172 },
  { h: 66, pref: 158, std: 198 },
  { h: 70, pref: 183, std: 228 },
  { h: 74, pref: 212, std: 262 },
  { h: 78, pref: 242, std: 300 },
])

// -------------------------------------------------------------------
// F&G — separate male/female Preferred & Standard charts
// -------------------------------------------------------------------
const fgMale = generateEntries([
  { h: 58, pref: 128, std: 158 },
  { h: 62, pref: 145, std: 180 },
  { h: 66, pref: 168, std: 208 },
  { h: 70, pref: 193, std: 240 },
  { h: 74, pref: 222, std: 275 },
  { h: 78, pref: 252, std: 312 },
])

const fgFemale = generateEntries([
  { h: 58, pref: 118, std: 148 },
  { h: 62, pref: 132, std: 168 },
  { h: 66, pref: 152, std: 195 },
  { h: 70, pref: 178, std: 225 },
  { h: 74, pref: 205, std: 260 },
  { h: 78, pref: 235, std: 298 },
])

// -------------------------------------------------------------------
// American Amicable — broad SI, moderate build limits
// -------------------------------------------------------------------
const amamMale = generateEntries([
  { h: 58, pref: 138, std: 170 },
  { h: 62, pref: 155, std: 192 },
  { h: 66, pref: 178, std: 220 },
  { h: 70, pref: 205, std: 252 },
  { h: 74, pref: 234, std: 288 },
  { h: 78, pref: 265, std: 325 },
])

const amamFemale = generateEntries([
  { h: 58, pref: 128, std: 160 },
  { h: 62, pref: 142, std: 180 },
  { h: 66, pref: 162, std: 205 },
  { h: 70, pref: 188, std: 238 },
  { h: 74, pref: 218, std: 272 },
  { h: 78, pref: 248, std: 310 },
])

// -------------------------------------------------------------------
// Americo — DocuSign only, moderate limits
// -------------------------------------------------------------------
const americoMale = generateEntries([
  { h: 58, pref: 130, std: 162 },
  { h: 62, pref: 148, std: 185 },
  { h: 66, pref: 170, std: 213 },
  { h: 70, pref: 196, std: 245 },
  { h: 74, pref: 224, std: 280 },
  { h: 78, pref: 255, std: 318 },
])

const americoFemale = generateEntries([
  { h: 58, pref: 120, std: 152 },
  { h: 62, pref: 136, std: 172 },
  { h: 66, pref: 155, std: 198 },
  { h: 70, pref: 180, std: 228 },
  { h: 74, pref: 208, std: 262 },
  { h: 78, pref: 238, std: 300 },
])

// -------------------------------------------------------------------
// John Hancock — lenient limits (most accommodating nicotine)
// -------------------------------------------------------------------
const jhMale = generateEntries([
  { h: 58, pref: 142, std: 175 },
  { h: 62, pref: 160, std: 198 },
  { h: 66, pref: 185, std: 228 },
  { h: 70, pref: 212, std: 260 },
  { h: 74, pref: 242, std: 298 },
  { h: 78, pref: 275, std: 338 },
])

const jhFemale = generateEntries([
  { h: 58, pref: 132, std: 165 },
  { h: 62, pref: 148, std: 185 },
  { h: 66, pref: 170, std: 212 },
  { h: 70, pref: 196, std: 245 },
  { h: 74, pref: 226, std: 282 },
  { h: 78, pref: 258, std: 322 },
])

// -------------------------------------------------------------------
// Transamerica — moderate, unique DUI schedule
// -------------------------------------------------------------------
const transamericaMale = generateEntries([
  { h: 58, pref: 132, std: 165 },
  { h: 62, pref: 150, std: 188 },
  { h: 66, pref: 172, std: 215 },
  { h: 70, pref: 198, std: 248 },
  { h: 74, pref: 226, std: 283 },
  { h: 78, pref: 258, std: 320 },
])

const transamericaFemale = generateEntries([
  { h: 58, pref: 122, std: 155 },
  { h: 62, pref: 138, std: 175 },
  { h: 66, pref: 158, std: 200 },
  { h: 70, pref: 183, std: 232 },
  { h: 74, pref: 210, std: 268 },
  { h: 78, pref: 242, std: 305 },
])

// -------------------------------------------------------------------
// United Home Life — moderate, DLX product accepts DUI
// -------------------------------------------------------------------
const uhlMale = generateEntries([
  { h: 58, pref: 135, std: 168 },
  { h: 62, pref: 152, std: 190 },
  { h: 66, pref: 175, std: 218 },
  { h: 70, pref: 202, std: 250 },
  { h: 74, pref: 230, std: 286 },
  { h: 78, pref: 262, std: 325 },
])

const uhlFemale = generateEntries([
  { h: 58, pref: 125, std: 158 },
  { h: 62, pref: 140, std: 178 },
  { h: 66, pref: 160, std: 203 },
  { h: 70, pref: 186, std: 235 },
  { h: 74, pref: 215, std: 270 },
  { h: 78, pref: 246, std: 308 },
])

// -------------------------------------------------------------------
// Exported lookup
// -------------------------------------------------------------------
export const BUILD_CHARTS: CarrierBuildChart[] = [
  { carrierId: "lga", male: lgaMale, female: lgaFemale },
  { carrierId: "sbli", male: sbliMale, female: sbliFemale },
  { carrierId: "moo", male: mooMale, female: mooFemale },
  { carrierId: "nlg", male: nlgMale, female: nlgFemale },
  { carrierId: "foresters", male: forestersMale, female: forestersFemale },
  { carrierId: "fg", male: fgMale, female: fgFemale },
  { carrierId: "amam", male: amamMale, female: amamFemale },
  { carrierId: "americo", male: americoMale, female: americoFemale },
  { carrierId: "jh", male: jhMale, female: jhFemale },
  { carrierId: "transamerica", male: transamericaMale, female: transamericaFemale },
  { carrierId: "uhl", male: uhlMale, female: uhlFemale },
]

export const BUILD_CHARTS_BY_ID = new Map(
  BUILD_CHARTS.map((bc) => [bc.carrierId, bc]),
)

export function lookupBuildChart(
  carrierId: string,
  gender: Gender,
): BuildChartEntry[] | null {
  const chart = BUILD_CHARTS_BY_ID.get(carrierId)
  if (!chart) return null
  return gender === "Male" ? chart.male : chart.female
}
