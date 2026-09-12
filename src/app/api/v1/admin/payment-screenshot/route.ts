/**
 * GET /api/v1/admin/payment-screenshot?userId=<number>
 *
 * Returns the payment screenshot URL for a given user's payment order.
 * Used by admin to verify payment before approving/rejecting.
 *
 * Headers:
 *   Authorization: Bearer <token>  (ADMIN or SUPER_ADMIN required)
 *
 * Query params:
 *   userId  number  (required)
 *
 * Success 200:
 *   { "success": true, "data": { "screenshotUrl": string|null, "orderRef": string|null,
 *     "amountInr": number|null, "status": string|null } }
 */

import { requireAdmin } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import { getPaymentOrderByUserId } from "@/lib/services/subscriptionService"

export const GET = withErrorHandling(async (req) => {
  await requireAdmin(req)
  const userIdStr = new URL(req.url).searchParams.get("userId")
  const userId = parseInt(userIdStr ?? "")
  if (isNaN(userId)) return badRequest("userId query parameter is required")

  const order = await getPaymentOrderByUserId(userId)
  if (!order) {
    return ok({ screenshotUrl: null, orderRef: null, amountInr: null, status: null })
  }

  let screenshotUrl: string | null = null
  if (order.screenshotPath) {
    const p = order.screenshotPath
    screenshotUrl = p.startsWith("http") ? p : `/api/profile/image/${p}`
  }

  return ok({
    screenshotUrl,
    orderRef: order.orderRef,
    amountInr: Math.round(order.amountPaise / 100),
    status: order.status,
    paidAt: order.paidAt,
  })
})
