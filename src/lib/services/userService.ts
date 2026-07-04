import { eq, sql, and, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, type User } from "@/lib/db/schema"
import { cacheDelete, cacheDeletePattern, cacheGet, cacheSet } from "@/lib/cache"
import { hashPassword } from "@/lib/auth/password"
import { normalizeIndianMobile } from "@/lib/validation/phone"
import type { Role } from "@/types"

const USER_KEY = (id: number) => `user:${id}`
const USER_PHONE_KEY = (phone: string) => `user:phone:${phone}`

// Active = not soft-deleted. All reads filter on this so deleted users vanish
// from the app while their rows remain for audit and recovery.
const ACTIVE = isNull(users.deletedAt)

export async function getUserById(id: number): Promise<User | undefined> {
  const cached = cacheGet<User>(USER_KEY(id))
  if (cached) return cached

  const [user] = await db.select().from(users).where(and(eq(users.id, id), ACTIVE)).limit(1)
  if (user) cacheSet(USER_KEY(id), user)
  return user
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const normalized = normalizeIndianMobile(phone)
  const cached = cacheGet<User>(USER_PHONE_KEY(normalized))
  if (cached) return cached

  const [user] = await db.select().from(users).where(and(eq(users.phone, normalized), ACTIVE)).limit(1)
  if (user) cacheSet(USER_PHONE_KEY(normalized), user)
  return user
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(and(eq(users.username, username), ACTIVE)).limit(1)
  return user
}

export async function createUser(data: {
  phone: string
  username: string | null
  password: string
  role?: Role
  isApproved?: boolean
}): Promise<User> {
  const passwordHash = await hashPassword(data.password)
  const [user] = await db
    .insert(users)
    .values({
      phone: data.phone.replace(/\D/g, ""),
      username: data.username,
      passwordHash,
      role: data.role ?? "USER",
      isApproved: data.isApproved ?? false,
    })
    .returning()

  cacheSet(USER_KEY(user.id), user)
  cacheSet(USER_PHONE_KEY(user.phone), user)
  cacheDeletePattern("stats:")
  return user
}

export async function updateUserApproval(id: number, isApproved: boolean): Promise<User> {
  const [user] = await db.update(users).set({ isApproved }).where(eq(users.id, id)).returning()
  cacheSet(USER_KEY(id), user)
  cacheSet(USER_PHONE_KEY(user.phone), user)
  cacheDeletePattern("stats:")
  return user
}

export async function updateUserRole(id: number, role: Role): Promise<User> {
  const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning()
  cacheSet(USER_KEY(id), user)
  cacheSet(USER_PHONE_KEY(user.phone), user)
  cacheDeletePattern("stats:")
  return user
}

export async function updateUserUsername(id: number, username: string): Promise<User> {
  const [user] = await db.update(users).set({ username }).where(eq(users.id, id)).returning()
  cacheSet(USER_KEY(id), user)
  cacheSet(USER_PHONE_KEY(user.phone), user)
  return user
}

/**
 * Soft-delete: mark the user as deleted (deletedAt = now) instead of removing
 * the row. All active queries filter on deletedAt IS NULL, so the user
 * disappears from the app immediately while the row is retained for audit
 * and recovery. Profile/interests cascade is handled by the caller hiding
 * the profile (visible=false) — the FK ON DELETE CASCADE only fires on a
 * hard delete, which we no longer perform.
 */
export async function deleteUser(id: number): Promise<void> {
  await db
    .update(users)
    .set({ deletedAt: new Date(), isApproved: false })
    .where(and(eq(users.id, id), ACTIVE))
  cacheDelete(USER_KEY(id))
  cacheDeletePattern("user:")
  cacheDeletePattern("profile:")
  cacheDeletePattern("profiles:")
  cacheDeletePattern("stats:")
}

export async function listAdmins(): Promise<User[]> {
  return db.select().from(users).where(and(eq(users.role, "ADMIN"), ACTIVE))
}

export async function countUsers(): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "USER"), ACTIVE))
  return count
}

export async function countApprovedUsers(): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "USER"), eq(users.isApproved, true), ACTIVE))
  return count
}

export async function countAdmins(): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "ADMIN"), ACTIVE))
  return count
}

export async function countSuperAdmins(): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "SUPER_ADMIN"), ACTIVE))
  return count
}