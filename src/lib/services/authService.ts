import { createUser, getUserByPhone, getUserByUsername } from "./userService"
import { createProfile, getProfileByUserId } from "./profileService"
import { verifyPassword } from "@/lib/auth/password"
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/validation/phone"
import type { ProfileType, PublicProfile, Role } from "@/types"

function looksLikePhoneInput(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return !/[a-zA-Z]/.test(trimmed)
}

export async function authenticateUser(phoneOrUsername: string, password: string) {
  const trimmed = phoneOrUsername.trim()
  let user

  if (looksLikePhoneInput(trimmed)) {
    const phone = normalizeIndianMobile(trimmed)
    if (isValidIndianMobile(phone)) {
      user = await getUserByPhone(phone)
    }
  }

  if (!user) {
    user = await getUserByUsername(trimmed)
  }

  if (!user) {
    return { success: false as const, error: "Invalid mobile number or password." }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return { success: false as const, error: "Invalid mobile number or password." }
  }

  return {
    success: true as const,
    user: {
      id: user.id,
      role: user.role as Role,
      phone: user.phone,
      username: user.username,
      isApproved: user.isApproved,
    },
  }
}

export async function registerUser(data: {
  phone: string
  username: string
  password: string
  profileType: ProfileType
  bio?: string
  dob?: string
  height?: string
  gotraSelf?: string
  gotraMother?: string
  education?: string
  profession?: string
  district?: string
  community?: string
  contact?: string
  photoBase64?: string
}) {
  const existing = await getUserByPhone(data.phone)
  if (existing) {
    return { success: false as const, error: "Mobile number is already registered." }
  }

  const user = await createUser({
    phone: data.phone,
    username: data.username,
    password: data.password,
    role: "USER",
    isApproved: false,
  })

  await createProfile(user.id, {
    type: data.profileType,
    bio: data.bio ?? "",
    visible: false,
    approvalStatus: "SENT",
    dob: data.dob,
    height: data.height || undefined,
    gotraSelf: data.gotraSelf,
    gotraMother: data.gotraMother,
    education: data.education,
    profession: data.profession,
    district: data.district,
    community: data.community ?? "Mewada",
    contact: data.contact ?? data.phone,
  })

  return { success: true as const, userId: user.id }
}

export async function getAuthenticatedProfile(userId: number): Promise<PublicProfile | null> {
  const profile = await getProfileByUserId(userId)
  return profile ?? null
}
