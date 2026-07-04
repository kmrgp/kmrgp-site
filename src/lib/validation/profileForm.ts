import { isValidIndianMobile } from "@/lib/validation/phone"
import type { PublicProfile } from "@/types"

export type ProfileFormField =
  | "username"
  | "type"
  | "dob"
  | "address"
  | "gotraSelf"
  | "gotraMother"
  | "education"
  | "profession"
  | "fatherName"
  | "fatherOccupation"
  | "motherName"
  | "motherOccupation"
  | "familyType"
  | "contact"
  | "guardianMobile"
  | "photo"
  | "declaration"

export type ProfileFormErrors = Partial<Record<ProfileFormField, string>>

export const PROFILE_FIELD_ORDER: ProfileFormField[] = [
  "photo",
  "type",
  "username",
  "dob",
  "address",
  "gotraSelf",
  "gotraMother",
  "education",
  "profession",
  "fatherName",
  "fatherOccupation",
  "motherName",
  "motherOccupation",
  "familyType",
  "contact",
  "guardianMobile",
  "declaration",
]

export interface ProfileFormInput {
  username: string
  type: PublicProfile["type"]
  dob: string
  address: string
  gotraSelf: string
  gotraMother: string
  education: string
  profession: string
  fatherName: string
  fatherOccupation: string
  motherName: string
  motherOccupation: string
  familyType: string
  contact: string
  guardianMobile: string
  hasPhoto: boolean
  declarationAccepted: boolean
  forSubmit: boolean
}

export function ageFromDob(dob: string): number | null {
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
export function validateProfileForm(data: ProfileFormInput): ProfileFormErrors {
  const errors: ProfileFormErrors = {}

  if (!data.type) errors.type = "bio.err.candidateType"

  const name = data.username.trim()
  if (name.length < 2) errors.username = "auth.err.fullName"

  if (!data.dob) {
    errors.dob = "auth.err.dob"
  } else {
    const age = ageFromDob(data.dob)
    if (age === null) errors.dob = "auth.err.dobInvalid"
    else if (age < 18) errors.dob = "auth.err.dobAge"
  }

  if (!data.address.trim()) errors.address = "bio.err.address"
  if (!data.gotraSelf.trim()) errors.gotraSelf = "auth.err.gotraSelf"
  if (!data.gotraMother.trim()) errors.gotraMother = "auth.err.gotraMother"
  if (!data.education.trim()) errors.education = "bio.err.education"
  if (!data.profession.trim()) errors.profession = "bio.err.profession"
  if (!data.fatherName.trim()) errors.fatherName = "bio.err.fatherName"
  if (!data.fatherOccupation.trim()) errors.fatherOccupation = "bio.err.fatherOccupation"
  if (!data.motherName.trim()) errors.motherName = "bio.err.motherName"
  if (!data.motherOccupation.trim()) errors.motherOccupation = "bio.err.motherOccupation"
  if (!data.familyType.trim()) errors.familyType = "bio.err.familyType"

  if (!isValidIndianMobile(data.contact)) errors.contact = "bio.err.candidateMobile"
  if (!isValidIndianMobile(data.guardianMobile)) errors.guardianMobile = "bio.err.guardianMobile"

  if (data.forSubmit) {
    if (!data.hasPhoto) errors.photo = "bio.err.photoRequired"
    if (!data.declarationAccepted) errors.declaration = "bio.err.declaration"
  }

  return errors
}
