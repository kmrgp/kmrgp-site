export type Role = "USER" | "ADMIN" | "SUPER_ADMIN"
export type ProfileType = "GROOM" | "BRIDE"
export type ApprovalStatus = "SENT" | "PENDING" | "APPROVED" | "REJECTED"
export type ActionType = "APPROVE" | "REJECT" | "DELETE"
export type InterestStatus = "PENDING" | "ACCEPTED" | "DECLINED"

export type { User } from "@/lib/db/schema"

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

export interface PublicDisplayStats {
  publicTotal: number
  publicSeed: number
  publicReal: number
  featuredCount: number
  approvedReal: number
}

export interface AuthResult {
  userId: number
  role: Role
  username: string | null
}

export interface SessionUser {
  id: number
  phone: string
  username: string | null
  role: Role
  isApproved: boolean
}

export interface SuperAdminStats {
  totalUsers: number
  approvedUsers: number
  pendingApprovals: number
  totalAdmins: number
  totalActions: number
  approvedCount: number
  rejectedCount: number
  deletedCount: number
}

export interface AuditLogEntry {
  id: number
  adminId: number | null
  actionType: ActionType
  targetUserId: number | null
  timestamp: Date
}
