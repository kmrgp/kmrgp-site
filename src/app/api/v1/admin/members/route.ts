/**
 * GET /api/v1/admin/members
 *
 * Returns member lists for admin review.
 *
 * Query params:
 *   status  "pending" | "rejected" | "all"  (default "pending")
 *
 * Headers:
 *   Authorization: Bearer <token>  (ADMIN or SUPER_ADMIN required)
 *
 * Success 200:
 *   { "success": true, "data": { "profiles": PublicProfile[] } }
 */

import { requireAdmin } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import {
  listPendingProfiles,
  listRejectedProfiles,
  listAllProfiles,
} from "@/lib/services/profileService"

export const GET = withErrorHandling(async (req) => {
  await requireAdmin(req)
  const status = new URL(req.url).searchParams.get("status") ?? "pending"

  let profiles
  if (status === "rejected") {
    profiles = await listRejectedProfiles()
  } else if (status === "all") {
    profiles = await listAllProfiles()
  } else if (status === "pending") {
    profiles = await listPendingProfiles()
  } else {
    return badRequest("status must be 'pending', 'rejected', or 'all'")
  }

  return ok({ profiles })
})
