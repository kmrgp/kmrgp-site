"use server"

import { revalidatePath } from "next/cache"
import { authenticateUser, registerUser } from "@/lib/services/authService"
import { isSubscriptionRequired } from "@/lib/services/subscriptionService"
import { createSession, deleteSession, getSession } from "@/lib/auth/session"
import type { ProfileType } from "@/types"
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/validation/phone"


export async function loginAction(phoneOrUsername: string, password: string) {
  const result = await authenticateUser(phoneOrUsername, password)
  if (!result.success) {
    return { success: false, error: result.error }
  }

  await createSession(result.user.id, result.user.role, result.user.phone, result.user.username, result.user.isApproved)
  revalidatePath("/")
  return { success: true, user: result.user }
}

export async function registerAction(data: {
  phone: string
  username: string
  password: string
  profileType: ProfileType
  dob?: string
  height?: string
  gotraSelf?: string
  gotraMother?: string
  education?: string
  profession?: string
  district?: string
  community?: string
}) {
  if (data.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." }
  }

  const phone = normalizeIndianMobile(data.phone)
  if (!isValidIndianMobile(phone)) {
    return { success: false, error: "A valid 10-digit Indian mobile number is required." }
  }

  const { required: paymentRequired } = await isSubscriptionRequired()
  if (paymentRequired) {
    return {
      success: false,
      error: "Registration requires payment. Please complete the QR payment step on the signup form.",
    }
  }

  const result = await registerUser({ ...data, phone })
  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, message: "Registration successful! You may now login." }
}

export async function logoutAction() {
  await deleteSession()
  revalidatePath("/")
}

export { getSession }
