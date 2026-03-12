/**
 * Shared date utilities for age calculation and birthdate parsing.
 */

/** Calculate age from an ISO date string (YYYY-MM-DD). Returns null for invalid dates. */
export function calculateAgeFromDob(dob: string): number | null {
  const date = new Date(dob)
  if (isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--
  }
  return age
}

/** Parse an ISO date string (YYYY-MM-DD) into month/day/year components. */
export function parseDateOfBirth(isoDate: string): { month: number; day: number; year: number } | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = parseInt(match[3], 10)
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { month, day, year }
}

/** Format month/day/year components into an ISO date string (YYYY-MM-DD). */
export function formatDateOfBirth(month: number, day: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Get the number of days in a given month/year (handles leap years). */
export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}
