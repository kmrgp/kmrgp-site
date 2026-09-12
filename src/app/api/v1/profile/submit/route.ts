/**
 * POST /api/v1/profile/submit
 *
 * Submit the authenticated user's profile for admin verification.
 * Transitions approvalStatus: SENT | REJECTED → PENDING.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Success 200:
 *   { "success": true, "data": { "profile": PublicProfile }, "message": "..." }
 *
 * Error 400 — already pending or approved
 * Error 404 — profile not found
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, badRequest, notFound, withErrorHandling } from "@/lib/api/response"
import { getProfileByUserId } from "@/lib/services/profileService"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { cacheDeletePattern } from "@/lib/cache"

export const POST = withErrorHandling(async (req) => {
  const session = await requireAuth(req)

  const profile = await getProfileByUserId(session.id)
  if (!profile) return notFound("Profile not found")

  if (profile.approvalStatus === "PENDING") {
    return badRequest("Approval has already been requested. Please wait for admin review.")
  }
  if (profile.approvalStatus === "APPROVED") {
    return badRequest("Profile is already approved.")
  }

  await db
    .update(profiles)
    .set({ approvalStatus: "PENDING" })
    .where(eq(profiles.userId, session.id))

  cacheDeletePattern("profiles:")

  const updated = await getProfileByUserId(session.id)
  return ok(
    { profile: updated },
    "Profile submitted for admin verification. You will be notified once approved."
  )
})
