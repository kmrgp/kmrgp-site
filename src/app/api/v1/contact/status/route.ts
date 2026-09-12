/**
 * GET /api/v1/contact/status?ownerId=<number>
 *
 * Check the contact request status with a specific profile owner.
 * Returns the contact number only if status is APPROVED.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Query params:
 *   ownerId  number  (required)
 *
 * Success 200:
 *   { "success": true, "data": { "status": "PENDING"|"APPROVED"|"REJECTED"|null, "contact": string|null } }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import { getContactRequestDetails } from "@/lib/services/contactRequestService"

export const GET = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const ownerIdStr = new URL(req.url).searchParams.get("ownerId")
  const ownerId = parseInt(ownerIdStr ?? "")
  if (isNaN(ownerId)) return badRequest("ownerId query parameter is required")

  const details = await getContactRequestDetails(session.id, ownerId)
  return ok(details)
})
