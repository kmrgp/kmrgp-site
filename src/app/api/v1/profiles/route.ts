/**
 * GET /api/v1/profiles
 *
 * Paginated, filtered profile search. Only returns approved, visible,
 * non-seed profiles. Authentication required.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Query parameters (all optional):
 *   page        number  default 1
 *   pageSize    number  default 9, max 48
 *   gender      "groom" | "bride" | "all"
 *   ageMin      number
 *   ageMax      number
 *   community   string
 *   district    string
 *   gotraQuery  string  (search in gotraSelf OR gotraMother)
 *   gotraExclude string (exclude matching gotra)
 *   keyword     string  (search in education, profession)
 *   heightMin   number  (minimum height in inches, e.g. 60 = 5'0")
 *   sort        "default" | "ageAsc" | "ageDesc" | "heightAsc" | "heightDesc" | "verifiedFirst"
 *
 * Success 200:
 *   { "success": true, "data": { profiles[], total, page, pageSize, totalPages } }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, withErrorHandling } from "@/lib/api/response"
import { searchProfiles } from "@/lib/services/profileService"
import type { ProfileSearchFilters } from "@/lib/services/profileService"

export const GET = withErrorHandling(async (req) => {
  await requireAuth(req)

  const url = new URL(req.url)
  const q = (key: string) => url.searchParams.get(key)

  const filters: ProfileSearchFilters = {
    page: parseInt(q("page") ?? "1") || 1,
    pageSize: Math.min(48, parseInt(q("pageSize") ?? "9") || 9),
    gender: (q("gender") as ProfileSearchFilters["gender"]) ?? "all",
    community: q("community") ?? undefined,
    district: q("district") ?? undefined,
    gotraQuery: q("gotraQuery") ?? undefined,
    gotraExclude: q("gotraExclude") ?? undefined,
    keyword: q("keyword") ?? undefined,
    sort: (q("sort") as ProfileSearchFilters["sort"]) ?? "default",
  }

  const ageMin = parseInt(q("ageMin") ?? "")
  if (!isNaN(ageMin)) filters.ageMin = ageMin

  const ageMax = parseInt(q("ageMax") ?? "")
  if (!isNaN(ageMax)) filters.ageMax = ageMax

  const heightMin = parseInt(q("heightMin") ?? "")
  if (!isNaN(heightMin)) filters.heightMinInches = heightMin

  const result = await searchProfiles(filters)
  return ok(result)
})
