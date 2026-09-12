/**
 * PATCH /api/v1/profile/update
 *
 * Update the authenticated user's profile bio-data.
 * Thin wrapper around the existing /api/profile/update route handler logic,
 * adapted for Bearer auth and the standard v1 response envelope.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   Content-Type: application/json
 *
 * Body: any subset of profile fields (see buildProfilePatch whitelist):
 *   { "dob"?, "height"?, "gotraSelf"?, "gotraMother"?, "education"?,
 *     "profession"?, "district"?, "community"?, "fatherName"?, "motherName"?,
 *     "address"?, "contact"?, "brothers"?, "sisters"?, "familyType"?,
 *     "parentsOccupation"?, "gender"?, "currentEducation"?, "companyName"?,
 *     "fatherOccupation"?, "motherOccupation"?, "guardianMobile"?,
 *     "whatsappNumber"?, "hobbies"?, "additionalDetails"?, "bio"?,
 *     "username"?, "type"?, "visible"? }
 *
 * Success 200:
 *   { "success": true, "data": { "profile": PublicProfile } }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, badRequest, forbidden, withErrorHandling } from "@/lib/api/response"
import { buildProfilePatch, getProfileByUserId, updateProfile } from "@/lib/services/profileService"
import { updateUserUsername } from "@/lib/services/userService"

export const PATCH = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const patch = buildProfilePatch(body)

  // Non-admin users cannot make themselves publicly visible
  if (patch.visible === true) {
    const current = await getProfileByUserId(session.id)
    if (current?.approvalStatus !== "APPROVED" && session.role === "USER") {
      return forbidden("Profile must be admin-approved before it can be shown publicly.")
    }
  }

  if (Object.keys(patch).length === 0 && !body.username) {
    return badRequest("Nothing to update")
  }

  if (typeof body.username === "string" && body.username.trim()) {
    await updateUserUsername(session.id, body.username.trim())
  }

  const updated = await updateProfile(session.id, patch)

  // Re-fetch to get the full public profile shape with imageUrl resolved
  const profile = await getProfileByUserId(session.id)
  return ok({ profile: profile ?? updated })
})
