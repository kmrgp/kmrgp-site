/**
 * GET /api/v1/admin/contact-requests
 *
 * Lists all pending contact requests for admin review.
 *
 * Headers:
 *   Authorization: Bearer <token>  (ADMIN or SUPER_ADMIN required)
 *
 * Success 200:
 *   { "success": true, "data": { "requests": ContactRequestWithNames[] } }
 *
 * ---
 *
 * PATCH /api/v1/admin/contact-requests
 *
 * Approve or reject a contact request.
 *
 * Body:
 *   { "requestId": number, "action": "APPROVE" | "REJECT" }
 *
 * Success 200:
 *   { "success": true, "data": null, "message": "..." }
 */

import { requireAdmin } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import {
  listPendingContactRequests,
  approveContactRequest,
  rejectContactRequest,
} from "@/lib/services/contactRequestService"

export const GET = withErrorHandling(async (req) => {
  await requireAdmin(req)
  const requests = await listPendingContactRequests()
  return ok({ requests })
})

export const PATCH = withErrorHandling(async (req) => {
  const session = await requireAdmin(req)
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { requestId, action } = body as Record<string, unknown>
  if (typeof requestId !== "number") return badRequest("requestId must be a number")
  if (action !== "APPROVE" && action !== "REJECT") {
    return badRequest("action must be 'APPROVE' or 'REJECT'")
  }

  if (action === "APPROVE") {
    await approveContactRequest(session.id, requestId)
    return ok(null, "Contact request approved")
  } else {
    await rejectContactRequest(session.id, requestId)
    return ok(null, "Contact request rejected")
  }
})
