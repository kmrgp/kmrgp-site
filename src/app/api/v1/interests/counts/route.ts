/**
 * GET /api/v1/interests/counts
 *
 * Returns notification badge counts for the authenticated user.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Success 200:
 *   { "success": true, "data": { "pending": number, "accepted": number } }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, withErrorHandling } from "@/lib/api/response"
import {
  countPendingReceivedInterests,
  countAcceptedMatches,
} from "@/lib/services/interestService"

export const GET = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const [pending, accepted] = await Promise.all([
    countPendingReceivedInterests(session.id),
    countAcceptedMatches(session.id),
  ])
  return ok({ pending, accepted })
})
