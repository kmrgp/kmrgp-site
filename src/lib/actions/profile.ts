"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { getProfileByUserId, updateProfile } from "@/lib/services/profileService"
import { updateUserUsername } from "@/lib/services/userService"
import type { ProfileType } from "@/types"

const SUBMITTABLE_STATUSES = new Set(["SENT", "REJECTED"])

export async function getMyProfile() {
  const session = await getSession()
  if (!session) return null
  return getProfileByUserId(session.id)
}

export async function updateMyProfile(data: {
  username?: string
  bio?: string
  dob?: string
  height?: string
  type?: ProfileType
  gotraSelf?: string
  gotraMother?: string
  education?: string
  currentEducation?: string
  profession?: string
  companyName?: string
  district?: string
  community?: string
  gender?: string
  fatherName?: string
  motherName?: string
  fatherOccupation?: string
  motherOccupation?: string
  address?: string
  contact?: string
  guardianMobile?: string
  whatsappNumber?: string
  brothers?: string
  sisters?: string
  familyType?: string
  parentsOccupation?: string
  hobbies?: string
  additionalDetails?: string
  visible?: boolean
}) {
  const session = await getSession()
  if (!session) return { success: false, error: "Not authenticated" }

  const profile = await getProfileByUserId(session.id)
  if (!profile) return { success: false, error: "Profile not found" }

  const { username, ...profileData } = data
  if (username !== undefined) {
    await updateUserUsername(session.id, username.trim())
  }

  await updateProfile(session.id, profileData)
  revalidatePath("/dashboard")
  return { success: true }
}

export async function requestApprovalAction() {
  const session = await getSession()
  if (!session) return { success: false, error: "Not authenticated" }

  const profile = await getProfileByUserId(session.id)
  if (!profile) return { success: false, error: "Profile not found" }
  if (!SUBMITTABLE_STATUSES.has(profile.approvalStatus)) {
    return { success: false, error: "Approval has already been requested or your profile is verified." }
  }

  await updateProfile(session.id, { approvalStatus: "PENDING" })
  revalidatePath("/dashboard")
  return { success: true }
}
