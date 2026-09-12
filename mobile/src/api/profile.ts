import { api, apiFetch } from "./client"
import type { PublicProfile, DashboardStats, ProfileSearchResult, PaymentStatus } from "@/types"

export async function getMyProfile(): Promise<PublicProfile & { profileId: number }> {
  return api.get("/profile/me")
}

export async function updateMyProfile(data: Partial<PublicProfile> & { username?: string }): Promise<{ profile: PublicProfile }> {
  return api.patch("/profile/update", data)
}

export async function submitProfileForApproval(): Promise<{ profile: PublicProfile }> {
  return api.post("/profile/submit")
}

export async function getMyStats(): Promise<DashboardStats> {
  return api.get("/profile/stats")
}

export async function uploadProfilePhoto(imageUri: string, mimeType: string): Promise<{ imageUrl: string }> {
  const formData = new FormData()
  // React Native FormData accepts { uri, type, name }
  formData.append("file", { uri: imageUri, type: mimeType, name: "photo.jpg" } as unknown as Blob)
  formData.append("kind", "photo")
  return api.upload("/profile/upload", formData)
}

export async function searchProfiles(params: {
  page?: number
  pageSize?: number
  gender?: "groom" | "bride" | "all"
  ageMin?: number
  ageMax?: number
  community?: string
  district?: string
  gotraQuery?: string
  gotraExclude?: string
  keyword?: string
  heightMin?: number
  sort?: string
}): Promise<ProfileSearchResult> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v))
  })
  return api.get(`/profiles?${qs.toString()}`)
}

export async function getProfile(userId: number): Promise<PublicProfile> {
  return api.get(`/profiles/${userId}`)
}

export async function getPaymentStatus(): Promise<PaymentStatus> {
  return api.get("/payment/status")
}

export async function uploadPaymentScreenshot(
  imageUri: string,
  mimeType: string,
  orderRef: string
): Promise<{ screenshotUrl: string }> {
  const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4024/api/v1"
  // The payment screenshot endpoint is at the OLD /api/payment/screenshot path (no v1)
  // and doesn't require auth. We build the URL manually.
  const uploadUrl = BASE_URL.replace("/api/v1", "") + "/api/payment/screenshot"

  const formData = new FormData()
  formData.append("file", { uri: imageUri, type: mimeType, name: "payment.jpg" } as unknown as Blob)
  formData.append("orderRef", orderRef)

  const response = await fetch(uploadUrl, { method: "POST", body: formData })
  const json = await response.json()
  if (!json.success) throw new Error(json.error ?? "Upload failed")
  return json
}
