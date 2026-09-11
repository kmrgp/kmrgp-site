"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { approveUser, rejectUser, deleteUserAsAdmin, setProfilePublicDisplay, hideAllSeedProfiles } from "@/lib/services/adminService"
import { listPendingProfiles, listRejectedProfiles, listAllProfiles, getPublicDisplayStats } from "@/lib/services/profileService"
import { getPaymentOrderByUserId } from "@/lib/services/subscriptionService"

export interface ApproveOptions {
  showPublic?: boolean
  featureOnHome?: boolean
}

export async function listPendingRequestsAction() {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  const pending = await listPendingProfiles()
  return { success: true, pending }
}

export async function listRejectedRequestsAction() {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  const rejected = await listRejectedProfiles()
  return { success: true, rejected }
}

export async function listAllMembersAction() {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  const members = await listAllProfiles()
  return { success: true, members }
}

export async function approveUserAction(userId: number, options?: ApproveOptions) {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  await approveUser(session.id, userId, {
    showPublic: options?.showPublic ?? true,
    featureOnHome: options?.featureOnHome ?? false,
  })
  revalidatePath("/dashboard")
  revalidatePath("/")
  revalidatePath("/profiles")
  return { success: true }
}

export async function rejectUserAction(userId: number) {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  await rejectUser(session.id, userId)
  revalidatePath("/dashboard")
  return { success: true }
}

export async function deleteUserAction(userId: number) {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  await deleteUserAsAdmin(session.id, userId)
  revalidatePath("/dashboard")
  revalidatePath("/")
  revalidatePath("/profiles")
  return { success: true }
}

export async function setProfilePublicDisplayAction(
  userId: number,
  patch: { visible?: boolean; featured?: boolean }
) {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  if (patch.visible === undefined && patch.featured === undefined) {
    return { success: false, error: "Nothing to update" }
  }
  await setProfilePublicDisplay(session.id, userId, patch)
  revalidatePath("/dashboard")
  revalidatePath("/")
  revalidatePath("/profiles")
  return { success: true }
}

export async function hideAllSeedProfilesAction() {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  const count = await hideAllSeedProfiles(session.id)
  revalidatePath("/dashboard")
  revalidatePath("/")
  revalidatePath("/profiles")
  return { success: true, count }
}

export async function getPublicDisplayStatsAction() {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }
  const stats = await getPublicDisplayStats()
  return { success: true, stats }
}

export async function getPaymentScreenshotAction(userId: number) {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false as const, error: "Forbidden" }
  }
  const order = await getPaymentOrderByUserId(userId)
  if (!order) return { success: true as const, screenshotUrl: null, orderRef: null }

  let screenshotUrl: string | null = null
  if (order.screenshotPath) {
    const path = order.screenshotPath
    screenshotUrl = path.startsWith("http") ? path : `/api/profile/image/${path}`
  }

  return {
    success: true as const,
    screenshotUrl,
    orderRef: order.orderRef,
    amountInr: Math.round(order.amountPaise / 100),
    status: order.status,
  }
}
