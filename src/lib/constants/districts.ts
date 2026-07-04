export const SUGGESTED_DISTRICTS = [
  "Bhopal",
  "Sehore",
  "Rajgarh",
  "Indore",
  "Ujjain",
  "Gwalior",
  "Jabalpur",
  "Vidisha",
  "Raisen",
  "Hoshangabad",
] as const

export function normalizeDistrictInput(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export function matchSuggestedDistrict(value: string): string | null {
  const normalized = normalizeDistrictInput(value).toLowerCase()
  if (!normalized) return null
  const hit = SUGGESTED_DISTRICTS.find((d) => d.toLowerCase() === normalized)
  return hit ?? null
}
