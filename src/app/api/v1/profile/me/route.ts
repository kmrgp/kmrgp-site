/**
 * GET /api/v1/profile/me
 *
 * Returns the authenticated user's full profile (including private fields
 * like contact, gotra, family info). This is the owner's own view.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Success 200:
 *   { "success": true, "data": PublicProfile & { profileId: number } }
 *
 * Error 401 — not authenticated
 * Error 404 — profile not yet created
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, notFound, withErrorHandling } from "@/lib/api/response"
import { getProfileByUserId } from "@/lib/services/profileService"

export const GET = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const profile = await getProfileByUserId(session.id)
  if (!profile) return notFound("Profile not found. Please complete registration.")
  return ok(profile)
})
