/**
 * POST /api/v1/auth/logout
 *
 * Mobile logout. Bearer tokens are stateless JWTs — the mobile client
 * should delete the token from SecureStore on its side.
 * This endpoint exists for API consistency and to allow future
 * server-side token revocation if needed.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Success 200:
 *   { "success": true, "data": null, "message": "Logged out" }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, withErrorHandling } from "@/lib/api/response"

export const POST = withErrorHandling(async (req) => {
  // Validate the token is real before confirming logout
  await requireAuth(req)
  return ok(null, "Logged out successfully")
})
