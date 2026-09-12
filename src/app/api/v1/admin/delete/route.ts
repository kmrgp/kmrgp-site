/**
 * DELETE /api/v1/admin/delete
 *
 * Soft-delete a member (hides profile, marks user as deleted).
 *
 * Headers:
 *   Authorization: Bearer <token>  (ADMIN or SUPER_ADMIN required)
 *
 * Body:
 *   { "userId": number }
 *
 * Success 200:
 *   { "success": true, "data": null, "message": "Member deleted" }
 */

import { requireAdmin } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import { deleteUserAsAdmin } from "@/lib/services/adminService"

export const DELETE = withErrorHandling(async (req) => {
  const session = await requireAdmin(req)
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { userId } = body as Record<string, unknown>
  if (typeof userId !== "number") return badRequest("userId must be a number")

  await deleteUserAsAdmin(session.id, userId)
  return ok(null, "Member deleted")
})
