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
  // This endpoint lives at /api/payment/screenshot (outside /api/v1/).
  // It does NOT require an auth token — the user is not yet registered.
  // Authentication is the orderRef tied to their registration session.
  const baseWithoutV1 = (process.env.EXPO_PUBLIC_API_URL ?? "https://kmrgp.com/api/v1")
    .replace(/\/api\/v1\/?$/, "")
  const uploadUrl = `${baseWithoutV1}/api/payment/screenshot`

  const formData = new FormData()
  formData.append("file", { uri: imageUri, type: mimeType, name: "payment.jpg" } as unknown as Blob)
  formData.append("orderRef", orderRef)

  let response: Response
  try {
    response = await fetch(uploadUrl, { method: "POST", body: formData })
  } catch {
    throw new Error("Network error uploading screenshot. Check your connection.")
  }

  let json: { success: boolean; data?: { screenshotUrl: string }; screenshotUrl?: string; error?: string }
  try {
    json = await response.json()
  } catch {
    throw new Error("Unexpected server response during screenshot upload.")
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? "Screenshot upload failed. Please try again.")
  }

  // Handle both the v1 envelope { success, data: { screenshotUrl } }
  // and the legacy direct format { success, screenshotUrl }
  const screenshotUrl = json.data?.screenshotUrl ?? json.screenshotUrl ?? ""
  return { screenshotUrl }
}

export async function uploadCastCertificate(fileUri: string, mimeType: string): Promise<{ fileUrl: string }> {
  const formData = new FormData()
  formData.append("file", { uri: fileUri, type: mimeType, name: "cast.pdf" } as unknown as Blob)
  formData.append("kind", "cast")
  return api.upload("/profile/upload", formData)
}
