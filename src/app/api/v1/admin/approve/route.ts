/**
 * POST /api/v1/admin/approve
 *
 * Approve a member's registration. Sets isApproved=true, approvalStatus=APPROVED.
 * Optionally makes the profile publicly visible and/or featured.
 *
 * Headers:
 *   Authorization: Bearer <token>  (ADMIN or SUPER_ADMIN required)
 *
 * Body:
 *   { "userId": number, "showPublic"?: boolean, "featureOnHome"?: boolean }
 *
 * Success 200:
 *   { "success": true, "data": null, "message": "Member approved" }
 */

import { requireAdmin } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import { approveUser } from "@/lib/services/adminService"

export const POST = withErrorHandling(async (req) => {
  const session = await requireAdmin(req)
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { userId, showPublic, featureOnHome } = body as Record<string, unknown>
  if (typeof userId !== "number") return badRequest("userId must be a number")

  await approveUser(session.id, userId, {
    showPublic: showPublic === true,
    featureOnHome: featureOnHome === true,
  })

  return ok(null, "Member approved successfully")
})
