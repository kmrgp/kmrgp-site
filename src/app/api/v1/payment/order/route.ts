/**
 * POST /api/v1/payment/order
 *
 * Creates a registration payment order. Returns the orderRef that the
 * mobile client uses to upload the payment screenshot.
 *
 * This is the PAID registration path. Free registration uses POST /api/v1/auth/register.
 *
 * No authentication required — the user does not exist yet.
 *
 * Request body:
 *   {
 *     "phone": "9876543210",
 *     "username": "Full Name",
 *     "password": "secret123",
 *     "profileType": "GROOM" | "BRIDE",
 *     "dob"?: "2000-01-15",
 *     "gotraSelf"?: "Dod",
 *     "gotraMother"?: "Rathore",
 *     "education"?: "Graduate",
 *     "profession"?: "Engineer",
 *     "district"?: "Bhopal",
 *     "community"?: "Mewada"
 *   }
 *
 * Success 201:
 *   { "success": true, "data": { "orderRef": "kmrgp-...", "amountInr": 501,
 *     "planName": "Yearly Profile", "planDurationDays": 365 } }
 *
 * Error 400 — validation failed
 * Error 409 — phone already registered
 */

import { ok, created, badRequest, conflict, withErrorHandling } from "@/lib/api/response"
import { createRegistrationPaymentOrder } from "@/lib/services/subscriptionService"
import { getUserByPhone } from "@/lib/services/userService"
import { normalizeIndianMobile, isValidIndianMobile } from "@/lib/validation/phone"
import type { ProfileType } from "@/types"

const VALID_PROFILE_TYPES: ProfileType[] = ["GROOM", "BRIDE"]

export const POST = withErrorHandling(async (req) => {
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { phone, username, password, profileType, dob, gotraSelf, gotraMother,
    education, profession, district, community } = body as Record<string, unknown>

  if (typeof phone !== "string" || !phone.trim()) return badRequest("phone is required")
  if (typeof username !== "string" || username.trim().length < 2) return badRequest("username must be at least 2 characters")
  if (typeof password !== "string" || password.length < 6) return badRequest("password must be at least 6 characters")
  if (typeof profileType !== "string" || !VALID_PROFILE_TYPES.includes(profileType as ProfileType)) {
    return badRequest(`profileType must be one of: ${VALID_PROFILE_TYPES.join(", ")}`)
  }

  const normalizedPhone = normalizeIndianMobile((phone as string).trim())
  if (!isValidIndianMobile(normalizedPhone)) return badRequest("phone must be a valid 10-digit Indian mobile number")

  // Check duplicate before creating an order
  const existing = await getUserByPhone(normalizedPhone)
  if (existing) return conflict("Mobile number is already registered. Please login instead.")

  const result = await createRegistrationPaymentOrder({
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
  })

  if (!result.success) return badRequest(result.error ?? "Could not create payment order")

  return created({
    orderRef: result.orderRef,
    amountInr: result.amountInr,
    planName: result.planName,
    planDurationDays: result.planDurationDays,
  })
})
