/**
 * POST /api/v1/auth/register
 *
 * Mobile free-plan registration (no payment required).
 * When a subscription plan is active, use POST /api/v1/payment/order instead
 * to start the QR payment → screenshot flow.
 *
 * Request body:
 *   {
 *     "phone": "9876543210",
 *     "username": "Full Name",
 *     "password": "secret123",
 *     "profileType": "GROOM" | "BRIDE",
 *     "dob": "2000-01-15",          // optional
 *     "gotraSelf": "Dod",           // optional
 *     "gotraMother": "Rathore",     // optional
 *     "education": "Graduate",      // optional
 *     "profession": "Engineer",     // optional
 *     "district": "Bhopal",         // optional
 *     "community": "Mewada"         // optional, default "Mewada"
 *   }
 *
 * Success 201:
 *   { "success": true, "data": { "token": "...", "user": {...} } }
 *
 * Error 400 — validation failed
 * Error 409 — phone already registered
 * Error 402 — payment required (use /api/v1/payment/order)
 */

import { registerUser } from "@/lib/services/authService"
import { isSubscriptionRequired } from "@/lib/services/subscriptionService"
import { mintBearerToken } from "@/lib/api/bearer"
import { ok, created, badRequest, errorResponse, conflict, withErrorHandling } from "@/lib/api/response"
import { normalizeIndianMobile, isValidIndianMobile } from "@/lib/validation/phone"
import type { ProfileType } from "@/types"

const VALID_PROFILE_TYPES: ProfileType[] = ["GROOM", "BRIDE"]

export const POST = withErrorHandling(async (req) => {
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const {
    phone,
    username,
    password,
    profileType,
    dob,
    gotraSelf,
    gotraMother,
    education,
    profession,
    district,
    community,
  } = body as Record<string, unknown>

  // ── Field validation ──────────────────────────────────────────────────────
  if (typeof phone !== "string" || !phone.trim()) {
    return badRequest("phone is required")
  }
  if (typeof username !== "string" || username.trim().length < 2) {
    return badRequest("username must be at least 2 characters")
  }
  if (typeof password !== "string" || password.length < 6) {
    return badRequest("password must be at least 6 characters")
  }
  if (typeof profileType !== "string" || !VALID_PROFILE_TYPES.includes(profileType as ProfileType)) {
    return badRequest(`profileType must be one of: ${VALID_PROFILE_TYPES.join(", ")}`)
  }

  const normalizedPhone = normalizeIndianMobile(phone.trim())
  if (!isValidIndianMobile(normalizedPhone)) {
    return badRequest("phone must be a valid 10-digit Indian mobile number")
  }

  // ── Payment gate ──────────────────────────────────────────────────────────
  const { required, plan } = await isSubscriptionRequired()
  if (required && plan) {
    return errorResponse(402, "PAYMENT_REQUIRED", `Registration requires payment of ₹${plan.amountInr}. Use POST /api/v1/payment/order to start the QR payment flow.`)
  }

  // ── Register ──────────────────────────────────────────────────────────────
  const result = await registerUser({
    phone: normalizedPhone,
    username: (username as string).trim(),
    password: password as string,
    profileType: profileType as ProfileType,
    dob: typeof dob === "string" ? dob : undefined,
    gotraSelf: typeof gotraSelf === "string" ? gotraSelf : undefined,
    gotraMother: typeof gotraMother === "string" ? gotraMother : undefined,
    education: typeof education === "string" ? education : undefined,
    profession: typeof profession === "string" ? profession : undefined,
    district: typeof district === "string" ? district : undefined,
    community: typeof community === "string" ? community : "Mewada",
    contact: normalizedPhone,
  })

  if (!result.success) {
    return conflict(result.error ?? "Registration failed")
  }

  // Auto-login: mint a token so the client doesn't need a second request
  const token = await mintBearerToken(result.userId, "USER", normalizedPhone, (username as string).trim(), false)

  return created(
    {
      token,
      user: {
        id: result.userId,
        phone: normalizedPhone,
        username: (username as string).trim(),
        role: "USER",
        isApproved: false,
      },
    },
    "Registration successful. Your profile is pending admin approval."
  )
})
