/**
 * POST /api/v1/auth/login
 *
 * Mobile login endpoint. Accepts phone/username + password, returns a
 * Bearer JWT token. Identical auth logic to loginAction() but returns
 * the token directly instead of setting a cookie.
 *
 * Request body:
 *   { "loginId": "phone_or_username", "password": "..." }
 *
 * Success 200:
 *   { "success": true, "data": { "token": "...", "user": { id, phone, username, role, isApproved } } }
 *
 * Error 401:
 *   { "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }
 */

import { authenticateUser } from "@/lib/services/authService"
import { mintBearerToken } from "@/lib/api/bearer"
import { ok, badRequest, errorResponse, withErrorHandling } from "@/lib/api/response"
import { normalizeIndianMobile, isValidIndianMobile } from "@/lib/validation/phone"

export const POST = withErrorHandling(async (req) => {
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { loginId, password } = body as { loginId?: unknown; password?: unknown }

  if (typeof loginId !== "string" || !loginId.trim()) {
    return badRequest("loginId is required")
  }
  if (typeof password !== "string" || !password) {
    return badRequest("password is required")
  }

  const result = await authenticateUser(loginId.trim(), password)
  if (!result.success) {
    return errorResponse(401, "INVALID_CREDENTIALS", result.error ?? "Invalid credentials")
  }

  const { user } = result
  const token = await mintBearerToken(
    user.id,
    user.role,
    user.phone,
    user.username,
    user.isApproved
  )

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
    },
    "Login successful"
  )
})
