/**
 * POST /api/v1/admin/reject
 *
 * Reject a member's registration. Sets approvalStatus=REJECTED, visible=false.
 *
 * Headers:
 *   Authorization: Bearer <token>  (ADMIN or SUPER_ADMIN required)
 *
 * Body:
 *   { "userId": number }
 *
 * Success 200:
 *   { "success": true, "data": null, "message": "Member rejected" }
 */

import { requireAdmin } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import { rejectUser } from "@/lib/services/adminService"

export const POST = withErrorHandling(async (req) => {
  const session = await requireAdmin(req)
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { userId } = body as Record<string, unknown>
  if (typeof userId !== "number") return badRequest("userId must be a number")

  await rejectUser(session.id, userId)
  return ok(null, "Member rejected")
})
