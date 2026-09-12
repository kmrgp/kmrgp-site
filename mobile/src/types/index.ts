// ─── Mirror of the web app's core types ─────────────────────────────────────
// Keep in sync with kmrgp-site/src/types/index.ts

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN"
export type ProfileType = "GROOM" | "BRIDE"
export type ApprovalStatus = "SENT" | "PENDING" | "APPROVED" | "REJECTED"
export type InterestStatus = "PENDING" | "ACCEPTED" | "DECLINED"
export type PaymentOrderStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED"
export type ContactRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | null

export interface AuthUser {
  id: number
  phone: string
  username: string | null
  role: Role
  isApproved: boolean
}

export interface PublicProfile {
  userId: number
  username: string | null
  phone: string | null
  type: ProfileType
  bio: string | null
  visible: boolean
  isSeed: boolean
  featured: boolean
  approvalStatus: ApprovalStatus
  imageUrl: string | null
  dob: string | null
  height: string | null
  gotraSelf: string | null
  gotraMother: string | null
  education: string | null
  profession: string | null
  district: string | null
  community: string | null
  fatherName: string | null
  motherName: string | null
  address: string | null
  contact: string | null
  brothers: string | null
  sisters: string | null
  familyType: string | null
  parentsOccupation: string | null
  gender: string | null
  currentEducation: string | null
  companyName: string | null
  fatherOccupation: string | null
  motherOccupation: string | null
  guardianMobile: string | null
  whatsappNumber: string | null
  castCertificateUrl: string | null
  hobbies: string | null
  additionalDetails: string | null
  age?: number
}

export interface DashboardStats {
  profileViews: number
  interestsReceived: number
  acceptedMatches: number
  pendingInterests: number
}

export interface InterestWithProfile {
  id: number
  senderId: number
  receiverId: number
  name: string | null
  imageUrl: string | null
  type: string | null
  age: number | null
  gotraSelf: string | null
  gotraMother: string | null
  district: string | null
  contact: null
  status: InterestStatus
  createdAt: string
}

export interface ProfileSearchResult {
  profiles: PublicProfile[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface RegistrationPlan {
  id: number
  name: string
  description: string | null
  amountInr: number
  durationDays: number
}

export interface PaymentStatus {
  hasOrder: boolean
  status: PaymentOrderStatus | null
  orderRef: string | null
  amountInr: number | null
  screenshotUploaded: boolean
  paidAt: string | null
}

export interface ContactRequestDetails {
  status: ContactRequestStatus
  contact: string | null
}

export interface ContactRequestWithNames {
  id: number
  requesterId: number
  requesterName: string | null
  requesterPhone: string | null
  ownerId: number
  ownerName: string | null
  ownerPhone: string | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
}

// ─── API response envelope ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
  message: string | null
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
