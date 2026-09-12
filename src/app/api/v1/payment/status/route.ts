/**
 * GET /api/v1/payment/status
 *
 * Returns the payment order status for the authenticated user.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Success 200:
 *   { "success": true, "data": {
 *       "hasOrder": boolean,
 *       "status": "PENDING"|"PAID"|"FAILED"|"EXPIRED"|null,
 *       "amountInr": number|null,
 *       "screenshotUploaded": boolean,
 *       "paidAt": string|null
 *   } }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, withErrorHandling } from "@/lib/api/response"
import { getPaymentOrderByUserId } from "@/lib/services/subscriptionService"

export const GET = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const order = await getPaymentOrderByUserId(session.id)

  if (!order) {
    return ok({ hasOrder: false, status: null, amountInr: null, screenshotUploaded: false, paidAt: null })
  }

  return ok({
    hasOrder: true,
    status: order.status,
    orderRef: order.orderRef,
    amountInr: Math.round(order.amountPaise / 100),
    screenshotUploaded: !!order.screenshotPath,
    paidAt: order.paidAt?.toISOString() ?? null,
  })
})
