"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import {
  createRegistrationPaymentOrder,
  completeRegistrationPayment,
  isSubscriptionRequired,
} from "@/lib/services/subscriptionService"
import type { RegistrationPayload } from "@/lib/services/subscriptionService"
import { isRazorpayConfigured } from "@/lib/services/razorpayService"

export async function getRegistrationPlanAction() {
  const { required, plan } = await isSubscriptionRequired()
  if (!required || !plan) {
    return { success: true, required: false as const }
  }
  return {
    success: true,
    required: true as const,
    plan: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      amountInr: plan.amountInr,
      durationDays: plan.durationDays,
    },
    razorpayConfigured: isRazorpayConfigured(),
  }
}

export async function createRegistrationOrderAction(data: RegistrationPayload) {
  if (!isRazorpayConfigured()) {
    return { success: false as const, error: "Payment gateway is not configured." }
  }

  if (!data.phone?.trim() || !data.username?.trim() || !data.password || data.password.length < 6) {
    return { success: false as const, error: "Please fill all required fields (password min 6 characters)." }
  }

  try {
    return await createRegistrationPaymentOrder({
      ...data,
      phone: data.phone.replace(/\D/g, ""),
      profileType: data.profileType,
    })
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Could not create payment order.",
    }
  }
}

export async function verifyRegistrationPaymentAction(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  try {
    const result = await completeRegistrationPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )
    if (result.success) {
      revalidatePath("/dashboard")
      revalidatePath("/profiles")
    }
    return result
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Payment verification failed.",
    }
  }
}
