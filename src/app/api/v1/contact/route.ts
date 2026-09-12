/**
 * POST /api/v1/contact
 *
 * Request contact details for another member (admin-mediated).
 * Also sends a marriage interest to the profile owner.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Body:
 *   { "ownerId": number }
 *
 * Success 200:
 *   { "success": true, "data": { "status": "PENDING" } }
 *
 * Error 400 — cannot request own contact
 * Error 404 — profile not found
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import { createContactRequest } from "@/lib/services/contactRequestService"

export const POST = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { ownerId } = body as { ownerId?: unknown }
  if (typeof ownerId !== "number" || isNaN(ownerId)) {
    return badRequest("ownerId must be a number")
  }
  if (ownerId === session.id) {
    return badRequest("You cannot request your own contact details")
  }

  const result = await createContactRequest(session.id, ownerId)
  return ok({ status: "PENDING" }, result.alreadyRequested ? "Contact request already pending" : "Contact request sent. Admin will review shortly.")
})
