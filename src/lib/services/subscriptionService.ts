import { eq, and, desc } from "drizzle-orm"
import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import {
  users,
  profiles,
  paymentOrders,
  profileSubscriptions,
  type SubscriptionPlan,
} from "@/lib/db/schema"
import { hashPassword } from "@/lib/auth/password"
import { getUserByPhone } from "./userService"
import { getDefaultActivePlan, getPlanById } from "./subscriptionPlanService"
import { cacheSet, cacheDeletePattern } from "@/lib/cache"
import type { ProfileType } from "@/types"
const USER_KEY = (id: number) => `user:${id}`
const USER_PHONE_KEY = (phone: string) => `user:phone:${phone}`

export interface RegistrationPayload {
  phone: string
  username: string
  password: string
  profileType: ProfileType
  dob?: string
  gotraSelf?: string
  gotraMother?: string
  education?: string
  profession?: string
  district?: string
  community?: string
}

/**
 * Creates a local payment order record and returns the order reference that
 * the frontend uses when uploading the payment screenshot.
 *
 * The user's password is hashed before being stored in registrationPayload so
 * it is never persisted as plain text.
 */
export async function createRegistrationPaymentOrder(payload: RegistrationPayload) {
  const plan = await getDefaultActivePlan()
  if (!plan) {
    return { success: false as const, error: "No active subscription plan configured." }
  }

  if (plan.amountInr <= 0) {
    return { success: false as const, error: "Invalid plan amount." }
  }

  const amountPaise = plan.amountInr * 100
  // Unique order reference: kmrgp-<timestamp>-<4 random hex chars>
  const orderRef = `kmrgp-${Date.now()}-${randomBytes(2).toString("hex")}`

  // Pre-hash the password so we never store it plain in the DB.
  const passwordHash = await hashPassword(payload.password)
  const storedPayload = { ...payload, password: passwordHash, __hashed: true }

  const [order] = await db
    .insert(paymentOrders)
    .values({
      orderRef,
      planId: plan.id,
      amountPaise,
      registrationPayload: JSON.stringify(storedPayload),
      status: "PENDING",
    })
    .returning()

  return {
    success: true as const,
    orderRef: order.orderRef,
    amountInr: plan.amountInr,
    planName: plan.name,
    planDurationDays: plan.durationDays,
    dbOrderId: order.id,
  }
}

export type CompleteRegistrationResult =
  | { success: true; userId: number; alreadyPaid?: boolean }
  | { success: false; error: string }

/**
 * Called after the screenshot is uploaded. Creates the user account immediately
 * so the registrant can log in and fill their bio-data while the admin reviews
 * the payment screenshot and approves their profile.
 */
export async function completeRegistrationAfterScreenshot(
  orderRef: string
): Promise<CompleteRegistrationResult> {
  const [order] = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.orderRef, orderRef))
    .limit(1)

  if (!order) {
    return { success: false, error: "Order not found." }
  }

  // Idempotent — already processed.
  if (order.status === "PAID" && order.userId) {
    return { success: true, userId: order.userId, alreadyPaid: true }
  }

  if (!order.screenshotPath) {
    return { success: false, error: "Payment screenshot not uploaded yet." }
  }

  const plan = await getPlanById(order.planId)
  if (!plan) {
    return { success: false, error: "Plan not found." }
  }

  const raw = JSON.parse(order.registrationPayload) as RegistrationPayload & { __hashed?: boolean }

  // Check for duplicate phone (e.g. user submitted twice).
  const existing = await getUserByPhone(raw.phone)
  if (existing) {
    // Account already exists — link order to existing user and return success.
    await db
      .update(paymentOrders)
      .set({ status: "PAID", userId: existing.id, paidAt: new Date() })
      .where(eq(paymentOrders.id, order.id))
    return { success: true, userId: existing.id, alreadyPaid: true }
  }

  let userId: number
  try {
    // Insert the user directly using the pre-hashed password.
    const passwordHash = raw.__hashed
      ? raw.password
      : await hashPassword(raw.password)

    const [newUser] = await db
      .insert(users)
      .values({
        phone: raw.phone.replace(/\D/g, ""),
        username: raw.username,
        passwordHash,
        role: "USER",
        isApproved: false,
      })
      .returning()

    userId = newUser.id

    // Warm the cache so the session read right after login is fast.
    cacheSet(USER_KEY(userId), newUser)
    cacheSet(USER_PHONE_KEY(newUser.phone), newUser)
    cacheDeletePattern("stats:")
    cacheDeletePattern("profiles:")  // flush pending/all lists so admin sees new registration immediately

    await db.insert(profiles).values({
      userId,
      type: raw.profileType,
      bio: "",
      visible: false,
      approvalStatus: "SENT",
      dob: raw.dob ?? null,
      gotraSelf: raw.gotraSelf ?? null,
      gotraMother: raw.gotraMother ?? null,
      education: raw.education ?? null,
      profession: raw.profession ?? null,
      district: raw.district ?? null,
      community: raw.community ?? "Mewada",
      contact: raw.phone,
    })
    // Bust again after the profile row is committed so a concurrent
    // admin page load doesn't re-prime the cache with stale data.
    cacheDeletePattern("profiles:")
  } catch (err) {
    await db
      .update(paymentOrders)
      .set({ status: "FAILED" })
      .where(eq(paymentOrders.id, order.id))
    // Surface a clean, recognisable message for duplicate phone violations.
    const msg = err instanceof Error ? err.message : "Registration failed."
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return { success: false, error: "Mobile number is already registered." }
    }
    return { success: false, error: msg }
  }

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays)

  await db.insert(profileSubscriptions).values({
    userId,
    planId: plan.id,
    paymentOrderId: order.id,
    status: "ACTIVE",
    amountPaidPaise: order.amountPaise,
    startsAt: now,
    expiresAt,
  })

  await db
    .update(paymentOrders)
    .set({ status: "PAID", userId, paidAt: now })
    .where(eq(paymentOrders.id, order.id))

  return { success: true, userId }
}

export async function getActiveSubscription(userId: number) {
  const [sub] = await db
    .select()
    .from(profileSubscriptions)
    .where(and(eq(profileSubscriptions.userId, userId), eq(profileSubscriptions.status, "ACTIVE")))
    .orderBy(desc(profileSubscriptions.expiresAt))
    .limit(1)

  if (!sub) return null
  if (sub.expiresAt < new Date()) {
    await db
      .update(profileSubscriptions)
      .set({ status: "EXPIRED" })
      .where(eq(profileSubscriptions.id, sub.id))
    return null
  }
  return sub
}

export async function isSubscriptionRequired(): Promise<{
  required: boolean
  plan: SubscriptionPlan | null
}> {
  const plan = await getDefaultActivePlan()
  if (!plan || plan.amountInr <= 0) {
    return { required: false, plan: null }
  }
  return { required: true, plan }
}

/**
 * Return the screenshot URL for a given order reference (used in admin review).
 */
export async function getPaymentScreenshotUrl(orderRef: string): Promise<string | null> {
  const [order] = await db
    .select({ screenshotPath: paymentOrders.screenshotPath })
    .from(paymentOrders)
    .where(eq(paymentOrders.orderRef, orderRef))
    .limit(1)

  if (!order?.screenshotPath) return null
  const path = order.screenshotPath
  return path.startsWith("http") ? path : `/api/profile/image/${path}`
}

/**
 * Find the most recent payment order linked to a userId.
 */
export async function getPaymentOrderByUserId(userId: number) {
  const [order] = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.userId, userId))
    .orderBy(desc(paymentOrders.createdAt))
    .limit(1)
  return order ?? null
}
