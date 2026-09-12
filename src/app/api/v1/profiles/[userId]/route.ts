/**
 * GET /api/v1/profiles/:userId
 *
 * Returns a single approved profile by userId.
 * Contact details (phone, contact) are stripped for privacy.
 * Authentication required.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Path params:
 *   userId  number
 *
 * Success 200:
 *   { "success": true, "data": PublicProfile }
 *
 * Error 404 — profile not found or not approved
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, notFound, badRequest, withErrorHandling } from "@/lib/api/response"
import { getProfileByUserId, stripPrivateContact } from "@/lib/services/profileService"
import { recordProfileView } from "@/lib/services/profileViewService"

export const GET = withErrorHandling(async (req, ctx) => {
  const session = await requireAuth(req)
  const params = await ctx.params
  const userId = parseInt(params.userId)
  if (isNaN(userId)) return badRequest("userId must be a number")

  const profile = await getProfileByUserId(userId)
  if (!profile || profile.approvalStatus !== "APPROVED" || !profile.visible) {
    return notFound("Profile not found")
  }

  // Record a unique view (skips self-views internally)
  await recordProfileView(userId, session.id).catch(() => { /* non-blocking */ })

  // Strip private contact for non-self views
  const data = userId === session.id ? profile : stripPrivateContact(profile)
  return ok(data)
})
