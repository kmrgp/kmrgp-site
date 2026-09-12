import { api } from "./client"
import type { ContactRequestDetails, ContactRequestWithNames } from "@/types"

export async function requestContact(ownerId: number): Promise<{ status: "PENDING" }> {
  return api.post("/contact", { ownerId })
}

export async function getContactStatus(ownerId: number): Promise<ContactRequestDetails> {
  return api.get(`/contact/status?ownerId=${ownerId}`)
}

export async function getAdminPhone(): Promise<{ phone: string | null }> {
  return api.get("/contact/admin-phone", { public: true })
}

// Admin only
export async function getPendingContactRequests(): Promise<{ requests: ContactRequestWithNames[] }> {
  return api.get("/admin/contact-requests")
}

export async function resolveContactRequest(requestId: number, action: "APPROVE" | "REJECT"): Promise<null> {
  return api.patch("/admin/contact-requests", { requestId, action })
}
