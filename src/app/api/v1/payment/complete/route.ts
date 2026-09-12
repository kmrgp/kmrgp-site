/**
 * POST /api/v1/payment/complete
 *
 * Completes registration after the payment screenshot has been uploaded.
 * Creates the user account, profile, and subscription record.
 * Returns a Bearer token so the user is logged in immediately.
 *
 * No authentication required — the user does not exist yet.
 *
 * Request body:
 *   { "orderRef": "kmrgp-..." }
 *
 * Success 200:
 *   { "success": true, "data": { "token": "...", "user": { id, phone, username, role, isApproved } } }
 *
 * Error 400 — screenshot not yet uploaded
 * Error 404 — order not found
 * Error 409 — phone already registered (idempotent — returns token anyway)
 */

import { ok, badRequest, notFound, conflict, withErrorHandling } from "@/lib/api/response"
import { completeRegistrationAfterScreenshot } from "@/lib/services/subscriptionService"
import { getUserById } from "@/lib/services/userService"
import { mintBearerToken } from "@/lib/api/bearer"
import type { Role } from "@/types"

export const POST = withErrorHandling(async (req) => {
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { orderRef } = body as { orderRef?: unknown }
  if (typeof orderRef !== "string" || !orderRef.trim()) return badRequest("orderRef is required")

  const result = await completeRegistrationAfterScreenshot(orderRef.trim())

  if (!result.success) {
    const msg = result.error ?? "Registration completion failed"
    if (msg.includes("not found")) return notFound(msg)
    if (msg.includes("already registered")) return conflict(msg)
    return badRequest(msg)
  }

  const user = await getUserById(result.userId)
  if (!user) return badRequest("User created but could not be retrieved. Please login manually.")

  const token = await mintBearerToken(user.id, user.role as Role, user.phone, user.username, user.isApproved)

  return ok(
    {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        role: user.role,
        isApproved: user.isApproved,
      },
      alreadyRegistered: result.alreadyPaid ?? false,
    },
    "Registration complete. Your payment screenshot is pending admin review."
  )
})
