/**
 * GET /api/v1/payment/plan
 *
 * Returns the default active registration plan.
 * Mobile uses this on the registration screen to decide whether to show
 * the QR payment step.
 *
 * No authentication required.
 *
 * Success 200 — payment required:
 *   { "success": true, "data": { "required": true, "plan": { id, name, amountInr, durationDays } } }
 *
 * Success 200 — free registration:
 *   { "success": true, "data": { "required": false, "plan": null } }
 */

import { ok, withErrorHandling } from "@/lib/api/response"
import { isSubscriptionRequired } from "@/lib/services/subscriptionService"

export const GET = withErrorHandling(async () => {
  const { required, plan } = await isSubscriptionRequired()

  if (!required || !plan) {
    return ok({ required: false, plan: null })
  }

  return ok({
    required: true,
    plan: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      amountInr: plan.amountInr,
      durationDays: plan.durationDays,
    },
  })
})
