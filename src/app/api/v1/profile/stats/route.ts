/**
 * GET /api/v1/profile/stats
 *
 * Returns dashboard stats for the authenticated user:
 *   - profile views (unique viewers)
 *   - interests received (pending)
 *   - accepted matches
 *   - pending interests count
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Success 200:
 *   { "success": true, "data": { profileViews, interestsReceived, acceptedMatches, pendingInterests } }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, withErrorHandling } from "@/lib/api/response"
import { getDashboardStats } from "@/lib/services/dashboardService"

export const GET = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const stats = await getDashboardStats(session.id)
  return ok(stats)
})
