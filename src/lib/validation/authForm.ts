import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/validation/phone"

function looksLikePhoneInput(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return !/[a-zA-Z]/.test(trimmed)
}

export type SignupField =
  | "username"
  | "phone"
  | "password"
  | "confirmPassword"
  | "gotraSelf"
  | "gotraMother"
  | "dob"
  | "district"
  | "education"
  | "profession"
  | "photo"

export type SignupFieldErrors = Partial<Record<SignupField, string>>

/** Visual order on the signup form (top → bottom). */
export const SIGNUP_FIELD_ORDER: SignupField[] = [
  "photo",
  "username",
  "gotraSelf",
  "gotraMother",
  "dob",
  "district",
  "education",
  "profession",
  "phone",
  "password",
  "confirmPassword",
]

export const LOGIN_FIELD_ORDER = ["phone", "password"] as const

export interface SignupValidationInput {
  username: string
  phone: string
  password: string
  confirmPassword: string
  gotraSelf: string
  gotraMother: string
  dob: string
  district: string
  education: string
  profession: string
  hasPhoto: boolean
}

function ageFromDob(dob: string): number | null {
  if (!dob) return null
  const born = new Date(dob)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1
  return age
}

/** Returns i18n dict keys for field errors. */
export function validateSignupFields(data: SignupValidationInput): SignupFieldErrors {
  const errors: SignupFieldErrors = {}

  const name = data.username.trim()
  if (name.length < 2) errors.username = "auth.err.fullName"

  if (!isValidIndianMobile(data.phone)) errors.phone = "auth.err.mobile"

  if (data.password.length < 6) errors.password = "auth.err.password"

  if (!data.confirmPassword) {
    errors.confirmPassword = "auth.err.confirmPasswordRequired"
  } else if (data.confirmPassword !== data.password) {
    errors.confirmPassword = "auth.err.passwordMismatch"
  }

  if (!data.gotraSelf.trim()) errors.gotraSelf = "auth.err.gotraSelf"
  if (!data.gotraMother.trim()) errors.gotraMother = "auth.err.gotraMother"

  if (!data.dob) {
    errors.dob = "auth.err.dob"
  } else {
    const age = ageFromDob(data.dob)
    if (age === null) errors.dob = "auth.err.dobInvalid"
    else if (age < 18) errors.dob = "auth.err.dobAge"
  }

  if (!data.district.trim()) errors.district = "auth.err.district"

  if (!data.education.trim()) errors.education = "auth.err.education"
  if (!data.profession.trim()) errors.profession = "auth.err.profession"

  if (!data.hasPhoto) errors.photo = "auth.photoRequired"

  return errors
}

export function validateLoginFields(phoneOrUsername: string, password: string): {
  phone?: string
  password?: string
} {
  const errors: { phone?: string; password?: string } = {}
  const trimmed = phoneOrUsername.trim()

  if (!trimmed) {
    errors.phone = "auth.err.loginId"
  } else if (looksLikePhoneInput(trimmed) && !isValidIndianMobile(normalizeIndianMobile(trimmed))) {
    errors.phone = "auth.err.mobile"
  }

  if (!password) errors.password = "auth.err.passwordRequired"
  return errors
}
