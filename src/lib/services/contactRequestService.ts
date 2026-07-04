import { eq, and, desc, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/lib/db"
import { contactRequests, users, profiles } from "@/lib/db/schema"
import { cacheDelete, cacheDeletePattern, cacheGet, cacheSet } from "@/lib/cache"
import { sendInterest } from "@/lib/services/interestService"

const REQUEST_STATUS_KEY = (requesterId: number, ownerId: number) =>
  `contact_request:${requesterId}:${ownerId}`
const PENDING_REQUESTS_KEY = "contact_requests:pending"

export type ContactRequestStatus = "PENDING" | "APPROVED" | null

export interface ContactRequestDetails {
  status: ContactRequestStatus
  contact: string | null
}

interface ContactRequestRow {
  id: number
  requesterId: number
  ownerId: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: Date
  requesterName: string | null
  requesterPhone: string | null
  ownerName: string | null
  ownerPhone: string | null
}

export interface ContactRequestWithNames {
  id: number
  requesterId: number
  requesterName: string | null
  requesterPhone: string | null
  ownerId: number
  ownerName: string | null
  ownerPhone: string | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: Date
}

export async function getContactRequestStatus(
  requesterId: number,
  ownerId: number
): Promise<ContactRequestStatus> {
  const details = await getContactRequestDetails(requesterId, ownerId)
  return details.status
}

export async function getContactRequestDetails(
  requesterId: number,
  ownerId: number
): Promise<ContactRequestDetails> {
  const cached = cacheGet<ContactRequestDetails>(REQUEST_STATUS_KEY(requesterId, ownerId))
  if (cached !== undefined) return cached

  const [row] = await db
    .select({
      status: contactRequests.status,
      contact: profiles.contact,
    })
    .from(contactRequests)
    .leftJoin(profiles, eq(contactRequests.ownerId, profiles.userId))
    .where(
      and(
        eq(contactRequests.requesterId, requesterId),
        eq(contactRequests.ownerId, ownerId)
      )
    )
    .limit(1)

  const details: ContactRequestDetails =
    row?.status === "APPROVED"
      ? { status: "APPROVED", contact: row.contact ?? null }
      : row?.status === "PENDING"
        ? { status: "PENDING", contact: null }
        : { status: null, contact: null }

  cacheSet(REQUEST_STATUS_KEY(requesterId, ownerId), details)
  return details
}

export async function getContactRequestStatuses(
  requesterId: number,
  ownerIds: number[]
): Promise<Record<number, ContactRequestStatus>> {
  const unique = [...new Set(ownerIds.filter((id) => id > 0))]
  const result: Record<number, ContactRequestStatus> = {}
  for (const id of unique) result[id] = null
  if (unique.length === 0) return result

  const rows = await db
    .select({
      ownerId: contactRequests.ownerId,
      status: contactRequests.status,
    })
    .from(contactRequests)
    .where(
      and(
        eq(contactRequests.requesterId, requesterId),
        inArray(contactRequests.ownerId, unique)
      )
    )

  for (const row of rows) {
    result[row.ownerId] =
      row.status === "APPROVED" ? "APPROVED" : row.status === "PENDING" ? "PENDING" : null
  }
  return result
}

export async function createContactRequest(
  requesterId: number,
  ownerId: number
): Promise<{ success: boolean; alreadyRequested: boolean; error?: string }> {
  if (requesterId === ownerId) {
    return { success: false, alreadyRequested: false, error: "Cannot request your own contact." }
  }

  const [existing] = await db
    .select()
    .from(contactRequests)
    .where(
      and(
        eq(contactRequests.requesterId, requesterId),
        eq(contactRequests.ownerId, ownerId)
      )
    )
    .limit(1)

  if (existing) {
    return { success: true, alreadyRequested: true }
  }

  await db.insert(contactRequests).values({ requesterId, ownerId })
  await sendInterest(requesterId, ownerId)
  cacheDelete(REQUEST_STATUS_KEY(requesterId, ownerId))
  cacheDelete(PENDING_REQUESTS_KEY)
  cacheDeletePattern("contact_requests:")
  return { success: true, alreadyRequested: false }
}

export async function listPendingContactRequests(): Promise<ContactRequestWithNames[]> {
  const cached = cacheGet<ContactRequestWithNames[]>(PENDING_REQUESTS_KEY)
  if (cached) return cached

  const requesterUsers = alias(users, "requester_users")
  const ownerUsers = alias(users, "owner_users")

  const rows: ContactRequestRow[] = await db
    .select({
      id: contactRequests.id,
      requesterId: contactRequests.requesterId,
      ownerId: contactRequests.ownerId,
      status: contactRequests.status,
      createdAt: contactRequests.createdAt,
      requesterName: requesterUsers.username,
      requesterPhone: requesterUsers.phone,
      ownerName: ownerUsers.username,
      ownerPhone: ownerUsers.phone,
    })
    .from(contactRequests)
    .leftJoin(requesterUsers, eq(contactRequests.requesterId, requesterUsers.id))
    .leftJoin(ownerUsers, eq(contactRequests.ownerId, ownerUsers.id))
    .where(eq(contactRequests.status, "PENDING"))
    .orderBy(desc(contactRequests.createdAt))

  const result: ContactRequestWithNames[] = rows.map((row) => ({
    id: row.id,
    requesterId: row.requesterId,
    requesterName: row.requesterName,
    requesterPhone: row.requesterPhone,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    ownerPhone: row.ownerPhone,
    status: row.status,
    createdAt: row.createdAt,
  }))

  cacheSet(PENDING_REQUESTS_KEY, result, 1000 * 60 * 2)
  return result
}

export async function approveContactRequest(
  adminId: number,
  requestId: number
): Promise<void> {
  const [req] = await db
    .update(contactRequests)
    .set({ status: "APPROVED" })
    .where(eq(contactRequests.id, requestId))
    .returning()

  if (req) {
    cacheDelete(REQUEST_STATUS_KEY(req.requesterId, req.ownerId))
    cacheDelete(PENDING_REQUESTS_KEY)
    cacheDeletePattern("contact_requests:")
  }
}

export async function rejectContactRequest(
  adminId: number,
  requestId: number
): Promise<void> {
  const [req] = await db
    .update(contactRequests)
    .set({ status: "REJECTED" })
    .where(eq(contactRequests.id, requestId))
    .returning()

  if (req) {
    cacheDelete(REQUEST_STATUS_KEY(req.requesterId, req.ownerId))
    cacheDelete(PENDING_REQUESTS_KEY)
    cacheDeletePattern("contact_requests:")
  }
}
