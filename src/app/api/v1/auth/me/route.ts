/**
 * GET /api/v1/auth/me
 *
 * Returns the currently authenticated user's basic info.
 * Used on app startup to verify the stored token is still valid
 * and refresh local user state (role, isApproved, username).
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Success 200:
 *   { "success": true, "data": { id, phone, username, role, isApproved } }
 *
 * Error 401 — token missing or expired
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, withErrorHandling } from "@/lib/api/response"

export const GET = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  return ok({
    id: session.id,
    phone: session.phone,
    username: session.username,
    role: session.role,
    isApproved: session.isApproved,
  })
})
