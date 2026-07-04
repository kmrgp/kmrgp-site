"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { getAdminContactPhone } from "@/lib/services/adminContactService"
import {
  createContactRequest,
  getContactRequestDetails,
  getContactRequestStatuses,
  listPendingContactRequests,
  approveContactRequest,
  rejectContactRequest,
  type ContactRequestStatus,
} from "@/lib/services/contactRequestService"

export async function requestContactAction(ownerId: number) {
  const session = await getSession()
  if (!session) return { success: false, error: "Not authenticated" }

  const result = await createContactRequest(session.id, ownerId)
  if (!result.success) {
    return { success: false, error: result.error }
  }

  revalidatePath("/profiles")
  revalidatePath("/dashboard")
  return { success: true, alreadyRequested: result.alreadyRequested, status: "PENDING" as const }
}

export async function getContactStatusAction(ownerId: number) {
  const session = await getSession()
  if (!session) return { success: true, status: null as ContactRequestStatus, contact: null }

  const details = await getContactRequestDetails(session.id, ownerId)
  return { success: true, status: details.status, contact: details.contact }
}

export async function getContactStatusesAction(ownerIds: number[]) {
  const session = await getSession()
  if (!session) return { success: true, statuses: {} as Record<number, ContactRequestStatus> }

  const statuses = await getContactRequestStatuses(session.id, ownerIds)
  return { success: true, statuses }
}

export async function getAdminContactPhoneAction() {
  const phone = await getAdminContactPhone()
  return { success: true, phone }
}

export async function listPendingContactRequestsAction() {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }

  const requests = await listPendingContactRequests()
  return { success: true, requests }
}

export async function approveContactRequestAction(requestId: number) {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }

  await approveContactRequest(session.id, requestId)
  revalidatePath("/dashboard")
  revalidatePath("/profiles")
  return { success: true }
}

export async function rejectContactRequestAction(requestId: number) {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Forbidden" }
  }

  await rejectContactRequest(session.id, requestId)
  revalidatePath("/dashboard")
  revalidatePath("/profiles")
  return { success: true }
}
