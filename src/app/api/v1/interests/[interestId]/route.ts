/**
 * PATCH /api/v1/interests/:interestId
 *
 * Accept or decline a received interest.
 * Only the receiver of the interest can respond to it.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Body:
 *   { "action": "ACCEPTED" | "DECLINED" }
 *
 * Success 200:
 *   { "success": true, "data": null, "message": "Interest accepted" }
 *
 * Error 400 — invalid action
 * Error 403 — not the receiver of this interest
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import { updateInterestStatus } from "@/lib/services/interestService"

export const PATCH = withErrorHandling(async (req, ctx) => {
  const session = await requireAuth(req)
  const params = await ctx.params
  const interestId = parseInt(params.interestId)
  if (isNaN(interestId)) return badRequest("interestId must be a number")

  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { action } = body as { action?: unknown }
  if (action !== "ACCEPTED" && action !== "DECLINED") {
    return badRequest("action must be 'ACCEPTED' or 'DECLINED'")
  }

  await updateInterestStatus(interestId, session.id, action)
  return ok(null, `Interest ${action.toLowerCase()}`)
})
