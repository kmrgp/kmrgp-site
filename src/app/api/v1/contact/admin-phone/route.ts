/**
 * GET /api/v1/contact/admin-phone
 *
 * Returns the admin helpline phone number for contact mediation display.
 * No authentication required — shown to logged-in users on profile pages.
 *
 * Success 200:
 *   { "success": true, "data": { "phone": string|null } }
 */

import { ok, withErrorHandling } from "@/lib/api/response"
import { getAdminContactPhone } from "@/lib/services/adminContactService"

export const GET = withErrorHandling(async () => {
  const phone = await getAdminContactPhone()
  return ok({ phone })
})
