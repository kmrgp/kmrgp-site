import { eq, and, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  paymentOrders,
  profileSubscriptions,
  type SubscriptionPlan,
} from "@/lib/db/schema"
import { registerUser } from "./authService"
import { createRazorpayOrder, verifyRazorpaySignature } from "./razorpayService"
import { getDefaultActivePlan, getPlanById } from "./subscriptionPlanService"
import type { ProfileType } from "@/types"

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

export async function createRegistrationPaymentOrder(payload: RegistrationPayload) {
  const plan = await getDefaultActivePlan()
  if (!plan) {
    return { success: false as const, error: "No active subscription plan configured." }
  }

  if (plan.amountInr <= 0) {
    return { success: false as const, error: "Invalid plan amount." }
  }

  const amountPaise = plan.amountInr * 100
  const receipt = `reg_${Date.now()}_${payload.phone.slice(-4)}`

  const rzOrder = await createRazorpayOrder(amountPaise, receipt, {
    phone: payload.phone,
    plan: plan.name,
  })

  const [order] = await db
    .insert(paymentOrders)
    .values({
      razorpayOrderId: rzOrder.id,
      planId: plan.id,
      amountPaise,
      registrationPayload: JSON.stringify(payload),
      status: "PENDING",
    })
    .returning()

  return {
    success: true as const,
    orderId: rzOrder.id,
    amountPaise,
    amountInr: plan.amountInr,
    planName: plan.name,
    planDurationDays: plan.durationDays,
    dbOrderId: order.id,
    keyId: process.env.RAZORPAY_KEY_ID!,
  }
}

export async function completeRegistrationPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    return { success: false as const, error: "Payment verification failed." }
  }

  const [order] = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.razorpayOrderId, razorpayOrderId))
    .limit(1)

  if (!order) {
    return { success: false as const, error: "Order not found." }
  }

  if (order.status === "PAID" && order.userId) {
    return { success: true as const, userId: order.userId, alreadyPaid: true }
  }

  const plan = await getPlanById(order.planId)
  if (!plan) {
    return { success: false as const, error: "Plan not found." }
  }

  const payload = JSON.parse(order.registrationPayload) as RegistrationPayload
  const reg = await registerUser({
    ...payload,
    contact: payload.phone,
  })

  if (!reg.success) {
    await db.update(paymentOrders).set({ status: "FAILED" }).where(eq(paymentOrders.id, order.id))
    return { success: false as const, error: reg.error }
  }

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays)

  await db.insert(profileSubscriptions).values({
    userId: reg.userId,
    planId: plan.id,
    paymentOrderId: order.id,
    razorpayPaymentId,
    status: "ACTIVE",
    amountPaidPaise: order.amountPaise,
    startsAt: now,
    expiresAt,
  })

  await db
    .update(paymentOrders)
    .set({ status: "PAID", userId: reg.userId, paidAt: now })
    .where(eq(paymentOrders.id, order.id))

  return { success: true as const, userId: reg.userId }
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

export async function isSubscriptionRequired(): Promise<{ required: boolean; plan: SubscriptionPlan | null }> {
  const plan = await getDefaultActivePlan()
  if (!plan || plan.amountInr <= 0) {
    return { required: false, plan: null }
  }
  return { required: true, plan }
}
