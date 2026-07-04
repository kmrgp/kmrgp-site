import { eq, and, or, count } from "drizzle-orm"
import { db } from "@/lib/db"
import { interests, users, profiles, type Interest, type User, type Profile } from "@/lib/db/schema"
import { cacheDeletePattern, cacheGet, cacheSet } from "@/lib/cache"
import type { InterestStatus } from "@/types"

const RECEIVED_KEY = (receiverId: number) => `interests:received:${receiverId}`
const SENT_KEY = (senderId: number) => `interests:sent:${senderId}`
const ACCEPTED_RECEIVED_KEY = (receiverId: number) => `interests:accepted:received:${receiverId}`
const ACCEPTED_SENT_KEY = (senderId: number) => `interests:accepted:sent:${senderId}`

interface InterestRow {
  interests: Interest
  users: User | null
  profiles: Profile | null
}

// Resolve an imagePath to a servable URL, matching toPublicProfile's logic.
// R2-hosted images store full CDN URLs; local/seed images store a bare filename.
function resolveImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null
  return imagePath.startsWith("http") ? imagePath : `/api/profile/image/${imagePath}`
}

export interface InterestWithProfile {
  id: number
  senderId: number
  receiverId: number
  name: string | null
  imageUrl: string | null
  type: string | null
  age: number | null
  gotraSelf: string | null
  gotraMother: string | null
  district: string | null
  contact: string | null
  status: string
  createdAt: Date
}

function estimateAge(dob: string | null): number {
  if (!dob || dob === "-") return 25
  const d = new Date(dob)
  if (!isNaN(d.getTime())) {
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    const m = now.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
    return age
  }
  // Fallback: first token may be a 4-digit year (legacy "1995-08-15")
  const [year] = dob.split(/[-\/]/).map(Number)
  if (year > 1900) return new Date().getFullYear() - year
  return 25
}

function toInterestWithProfile(row: InterestRow, asSender: boolean): InterestWithProfile {
  const otherUser = asSender ? null : row.users
  const otherProfile = asSender ? null : row.profiles
  // When asSender, the "other" party is the receiver; we have their user/profile
  // via the join on senderId. For sent interests we join the *receiver* instead,
  // handled by the caller's query shape — see getSentInterests.
  return {
    id: row.interests.id,
    senderId: row.interests.senderId,
    receiverId: row.interests.receiverId,
    name: otherUser?.username ?? "Unknown",
    imageUrl: resolveImageUrl(otherProfile?.imagePath ?? null),
    type: otherProfile?.type ?? null,
    age: otherProfile?.dob ? estimateAge(otherProfile.dob) : null,
    gotraSelf: otherProfile?.gotraSelf ?? null,
    gotraMother: otherProfile?.gotraMother ?? null,
    district: otherProfile?.district ?? null,
    contact: null,
    status: row.interests.status,
    createdAt: row.interests.createdAt,
  }
}

export async function getReceivedInterests(receiverId: number) {
  const cached = cacheGet<InterestWithProfile[]>(RECEIVED_KEY(receiverId))
  if (cached) return cached

  const rows = (await db
    .select()
    .from(interests)
    .leftJoin(users, eq(interests.senderId, users.id))
    .leftJoin(profiles, eq(interests.senderId, profiles.userId))
    .where(eq(interests.receiverId, receiverId))) as InterestRow[]

  const result = rows.map((row) => toInterestWithProfile(row, false))
  cacheSet(RECEIVED_KEY(receiverId), result)
  return result
}

export async function getSentInterests(senderId: number): Promise<InterestWithProfile[]> {
  const cached = cacheGet<InterestWithProfile[]>(SENT_KEY(senderId))
  if (cached) return cached

  const rows = (await db
    .select()
    .from(interests)
    .leftJoin(users, eq(interests.receiverId, users.id))
    .leftJoin(profiles, eq(interests.receiverId, profiles.userId))
    .where(eq(interests.senderId, senderId))) as InterestRow[]

  // For sent interests, the joined user/profile is the RECEIVER.
  // toInterestWithProfile reads row.users/row.profiles regardless, so this works.
  const result = rows.map((row) => ({
    id: row.interests.id,
    senderId: row.interests.senderId,
    receiverId: row.interests.receiverId,
    name: row.users?.username ?? "Unknown",
    imageUrl: resolveImageUrl(row.profiles?.imagePath ?? null),
    type: row.profiles?.type ?? null,
    age: row.profiles?.dob ? estimateAge(row.profiles.dob) : null,
    gotraSelf: row.profiles?.gotraSelf ?? null,
    gotraMother: row.profiles?.gotraMother ?? null,
    district: row.profiles?.district ?? null,
    contact: null,
    status: row.interests.status,
    createdAt: row.interests.createdAt,
  }))
  cacheSet(SENT_KEY(senderId), result)
  return result
}

export async function getAcceptedInterestsReceived(receiverId: number): Promise<InterestWithProfile[]> {
  const cached = cacheGet<InterestWithProfile[]>(ACCEPTED_RECEIVED_KEY(receiverId))
  if (cached) return cached

  const rows = (await db
    .select()
    .from(interests)
    .leftJoin(users, eq(interests.senderId, users.id))
    .leftJoin(profiles, eq(interests.senderId, profiles.userId))
    .where(and(eq(interests.receiverId, receiverId), eq(interests.status, "ACCEPTED")))) as InterestRow[]

  const result = rows.map((row) => toInterestWithProfile(row, false))
  cacheSet(ACCEPTED_RECEIVED_KEY(receiverId), result)
  return result
}

export async function getAcceptedInterestsSent(senderId: number): Promise<InterestWithProfile[]> {
  const cached = cacheGet<InterestWithProfile[]>(ACCEPTED_SENT_KEY(senderId))
  if (cached) return cached

  const rows = (await db
    .select()
    .from(interests)
    .leftJoin(users, eq(interests.receiverId, users.id))
    .leftJoin(profiles, eq(interests.receiverId, profiles.userId))
    .where(and(eq(interests.senderId, senderId), eq(interests.status, "ACCEPTED")))) as InterestRow[]

  const result = rows.map((row) => ({
    id: row.interests.id,
    senderId: row.interests.senderId,
    receiverId: row.interests.receiverId,
    name: row.users?.username ?? "Unknown",
    imageUrl: resolveImageUrl(row.profiles?.imagePath ?? null),
    type: row.profiles?.type ?? null,
    age: row.profiles?.dob ? estimateAge(row.profiles.dob) : null,
    gotraSelf: row.profiles?.gotraSelf ?? null,
    gotraMother: row.profiles?.gotraMother ?? null,
    district: row.profiles?.district ?? null,
    contact: null,
    status: row.interests.status,
    createdAt: row.interests.createdAt,
  }))
  cacheSet(ACCEPTED_SENT_KEY(senderId), result)
  return result
}

export async function countReceivedInterests(receiverId: number): Promise<number> {
  const rows = await db.select({ count: count() }).from(interests).where(eq(interests.receiverId, receiverId))
  return Number(rows[0].count)
}

export async function countPendingReceivedInterests(receiverId: number): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(interests)
    .where(and(eq(interests.receiverId, receiverId), eq(interests.status, "PENDING")))
  return Number(rows[0].count)
}

export async function countAcceptedInterestsReceived(receiverId: number): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(interests)
    .where(and(eq(interests.receiverId, receiverId), eq(interests.status, "ACCEPTED")))
  return Number(rows[0].count)
}

export async function countAcceptedMatches(userId: number): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(interests)
    .where(
      and(
        eq(interests.status, "ACCEPTED"),
        or(eq(interests.receiverId, userId), eq(interests.senderId, userId))
      )
    )
  return Number(rows[0].count)
}

export async function sendInterest(senderId: number, receiverId: number): Promise<{ interest: Interest | undefined; alreadySent: boolean }> {
  const [interest] = await db
    .insert(interests)
    .values({ senderId, receiverId })
    .onConflictDoNothing()
    .returning()
  cacheDeletePattern(`interests:received:${receiverId}`)
  cacheDeletePattern(`interests:sent:${senderId}`)
  return { interest, alreadySent: !interest }
}

export async function updateInterestStatus(
  interestId: number,
  receiverId: number,
  status: InterestStatus
): Promise<Interest | undefined> {
  const [interest] = await db
    .update(interests)
    .set({ status })
    .where(and(eq(interests.id, interestId), eq(interests.receiverId, receiverId)))
    .returning()
  cacheDeletePattern(`interests:received:${receiverId}`)
  cacheDeletePattern(`interests:sent:${interest?.senderId}`)
  cacheDeletePattern(`interests:accepted:received:${receiverId}`)
  cacheDeletePattern(`interests:accepted:sent:${interest?.senderId}`)
  return interest
}