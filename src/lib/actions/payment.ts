"use server"

import { revalidatePath } from "next/cache"
import {
  createRegistrationPaymentOrder,
  completeRegistrationAfterScreenshot,
  isSubscriptionRequired,
} from "@/lib/services/subscriptionService"
import type { RegistrationPayload } from "@/lib/services/subscriptionService"
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/validation/phone"

/**
 * Returns whether a payment plan is active and what the fee is.
 * Used by SignupForm on mount to decide whether to show the QR step.
 */
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
  }
}

/**
 * Creates a local payment order and returns the order reference.
 * The frontend then shows the QR code and uses the orderRef when
 * POSTing the screenshot to /api/payment/screenshot.
 */
export async function createRegistrationOrderAction(data: RegistrationPayload) {
  if (!data.phone?.trim() || !data.username?.trim() || !data.password || data.password.length < 6) {
    return {
      success: false as const,
      error: "Please fill all required fields (password min 6 characters).",
    }
  }

  const phone = normalizeIndianMobile(data.phone)
  if (!isValidIndianMobile(phone)) {
    return {
      success: false as const,
      error: "A valid 10-digit Indian mobile number is required.",
    }
  }

  try {
    return await createRegistrationPaymentOrder({
      ...data,
      phone,
      profileType: data.profileType,
    })
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Could not create payment order.",
    }
  }
}

/**
 * Called after the screenshot has been uploaded via /api/payment/screenshot.
 * Creates the user account so the registrant can log in immediately.
 */
export async function completeRegistrationAction(orderRef: string) {
  try {
    const result = await completeRegistrationAfterScreenshot(orderRef)
    if (result.success) {
      revalidatePath("/dashboard")
      revalidatePath("/profiles")
    }
    return result
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Registration completion failed.",
    }
  }
}
