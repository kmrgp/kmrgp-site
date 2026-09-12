/**
 * GET /api/v1/interests
 *
 * Returns the authenticated user's interests.
 *
 * Query params:
 *   type  "received" | "sent" | "accepted"  (default "received")
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Success 200:
 *   For "received":
 *     { "success": true, "data": { "interests": InterestWithProfile[], "count": number } }
 *   For "sent":
 *     { "success": true, "data": { "interests": InterestWithProfile[] } }
 *   For "accepted":
 *     { "success": true, "data": { "received": InterestWithProfile[], "sent": InterestWithProfile[] } }
 *
 * ---
 *
 * POST /api/v1/interests
 *
 * Send a marriage interest to another member.
 *
 * Body:
 *   { "receiverId": number }
 *
 * Success 200:
 *   { "success": true, "data": { "alreadySent": boolean } }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, badRequest, withErrorHandling } from "@/lib/api/response"
import {
  getReceivedInterests,
  getSentInterests,
  getAcceptedInterestsReceived,
  getAcceptedInterestsSent,
  countPendingReceivedInterests,
  sendInterest,
} from "@/lib/services/interestService"

export const GET = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const type = new URL(req.url).searchParams.get("type") ?? "received"

  if (type === "sent") {
    const interests = await getSentInterests(session.id)
    return ok({ interests })
  }

  if (type === "accepted") {
    const [received, sent] = await Promise.all([
      getAcceptedInterestsReceived(session.id),
      getAcceptedInterestsSent(session.id),
    ])
    return ok({ received, sent })
  }

  // Default: received
  const [interests, count] = await Promise.all([
    getReceivedInterests(session.id),
    countPendingReceivedInterests(session.id),
  ])
  return ok({ interests, count })
})

export const POST = withErrorHandling(async (req) => {
  const session = await requireAuth(req)
  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Request body must be valid JSON")

  const { receiverId } = body as { receiverId?: unknown }
  if (typeof receiverId !== "number" || isNaN(receiverId)) {
    return badRequest("receiverId must be a number")
  }
  if (receiverId === session.id) {
    return badRequest("You cannot send an interest to yourself")
  }

  const result = await sendInterest(session.id, receiverId)
  return ok({ alreadySent: result.alreadySent ?? false }, result.alreadySent ? "Interest already sent" : "Interest sent successfully")
})
