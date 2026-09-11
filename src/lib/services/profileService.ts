import { eq, and, ilike, or, desc, asc, sql, isNull, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { profiles, users, type Profile, type User } from "@/lib/db/schema"
import { cacheDelete, cacheDeletePattern, cacheGet, cacheSet } from "@/lib/cache"
import type { ApprovalStatus, ProfileType, PublicProfile, PublicDisplayStats } from "@/types"

const PROFILE_KEY = (userId: number) => `profile:${userId}`
const APPROVED_PROFILES_KEY = "profiles:approved"
const FEATURED_PROFILES_KEY = "profiles:featured"
const PENDING_PROFILES_KEY = "profiles:pending"
const REJECTED_PROFILES_KEY = "profiles:rejected"
const ALL_PROFILES_KEY = "profiles:all"

export function stripPrivateContact(profile: PublicProfile): PublicProfile {
  return { ...profile, contact: null, phone: null }
}

export function toPublicProfile(user: User | null, profile: Profile): PublicProfile {
  const fileUrl = (path: string | null) =>
    path
      ? path.startsWith("http")
        ? path
        : `/api/profile/image/${path}`
      : null

  return {
    userId: profile.userId,
    username: user?.username ?? null,
    phone: user?.phone ?? null,
    type: profile.type as ProfileType,
    bio: profile.bio,
    visible: profile.visible,
    isSeed: profile.isSeed,
    featured: profile.featured,
    approvalStatus: profile.approvalStatus as ApprovalStatus,
    imageUrl: fileUrl(profile.imagePath),
    dob: profile.dob,
    height: profile.height,
    gotraSelf: profile.gotraSelf,
    gotraMother: profile.gotraMother,
    education: profile.education,
    profession: profile.profession,
    district: profile.district,
    community: profile.community,
    fatherName: profile.fatherName,
    motherName: profile.motherName,
    address: profile.address,
    contact: profile.contact,
    brothers: profile.brothers,
    sisters: profile.sisters,
    familyType: profile.familyType,
    parentsOccupation: profile.parentsOccupation,
    gender: profile.gender,
    currentEducation: profile.currentEducation,
    companyName: profile.companyName,
    fatherOccupation: profile.fatherOccupation ?? profile.parentsOccupation,
    motherOccupation: profile.motherOccupation,
    guardianMobile: profile.guardianMobile,
    whatsappNumber: profile.whatsappNumber,
    castCertificateUrl: fileUrl(profile.castCertificatePath),
    hobbies: profile.hobbies,
    additionalDetails: profile.additionalDetails,
  }
}

function estimateAge(dob: string | null): number {
  if (!dob || dob === "-") return 25
  const d = new Date(dob)
  if (!isNaN(d.getTime())) {
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    const m = now.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
    return age
  }
  const [year] = dob.split(/[-\/]/).map(Number)
  if (year > 1900) return new Date().getFullYear() - year
  return 25
}

export interface ProfileSearchFilters {
  gender?: "groom" | "bride" | "all"
  ageMin?: number
  ageMax?: number
  community?: string
  district?: string
  gotraQuery?: string
  gotraExclude?: string
  keyword?: string
  verifiedOnly?: boolean
  heightMinInches?: number
  sort?: "default" | "ageAsc" | "ageDesc" | "heightAsc" | "heightDesc" | "verifiedFirst"
  page?: number
  pageSize?: number
}

export interface ProfileSearchResult {
  profiles: PublicProfile[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Convert "5'10\"" -> inches for DB-side height filtering.
function heightToInches(h: string | null): number {
  if (!h) return 0
  const m = h.match(/(\d+)['’]\s*(\d+)/)
  if (m) return Number(m[1]) * 12 + Number(m[2])
  const cm = h.match(/(\d+)\s*cm/i)
  if (cm) return Math.round(Number(cm[1]) / 2.54)
  return 0
}

const CURRENT_YEAR = new Date().getFullYear()

/**
 * Server-side, DB-filtered, paginated profile search. Replaces the old
 * "load all approved profiles then filter in useMemo" approach so the app
 * scales beyond ~100 profiles. Builds a WHERE clause from the filters,
 * applies ORDER BY for the chosen sort, and LIMIT/OFFSET for pagination.
 */
export async function searchProfiles(filters: ProfileSearchFilters): Promise<ProfileSearchResult> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12))
  const offset = (page - 1) * pageSize

  // Admin/super-admin accounts are never listed as matrimonial profiles.
  // Seed profiles are never shown to the public — only real approved members.
  const conditions: SQL[] = [
    eq(profiles.visible, true),
    eq(profiles.approvalStatus, "APPROVED"),
    eq(profiles.isSeed, false),
    eq(users.role, "USER"),
  ]

  if (filters.gender && filters.gender !== "all") {
    conditions.push(eq(profiles.type, filters.gender.toUpperCase() as ProfileType))
  }
  if (filters.community && filters.community !== "all") {
    conditions.push(eq(profiles.community, filters.community))
  }
  if (filters.district && filters.district !== "all") {
    conditions.push(eq(profiles.district, filters.district))
  }
  if (filters.gotraQuery) {
    const q = `%${filters.gotraQuery}%`
    conditions.push(
      or(ilike(profiles.gotraSelf, q), ilike(profiles.gotraMother, q)) as SQL
    )
  }
  if (filters.gotraExclude) {
    const ex = `%${filters.gotraExclude}%`
    // NOT (gotraSelf ILIKE ex OR gotraMother ILIKE ex)
    conditions.push(
      sql`NOT (${ilike(profiles.gotraSelf, ex)} OR ${ilike(profiles.gotraMother, ex)})` as SQL
    )
  }
  if (filters.keyword) {
    const k = `%${filters.keyword}%`
    conditions.push(
      or(ilike(profiles.education, k), ilike(profiles.profession, k)) as SQL
    )
  }
  if (filters.verifiedOnly) {
    conditions.push(eq(profiles.isSeed, false))
  }

  // Age filter via DOB year. dob is a varchar like "1995-08-15" or "15/08/1995".
  // We filter on the year component; precise day-level age is applied in-memory.
  const ageMin = filters.ageMin ?? 0
  const ageMax = filters.ageMax ?? 999
  if (ageMin > 0 || ageMax < 999) {
    const maxYear = CURRENT_YEAR - ageMin
    const minYear = CURRENT_YEAR - ageMax
    // Extract a 4-digit year from the dob string. Works for ISO and dd/mm/yyyy.
    conditions.push(
      sql`(regexp_extract(${profiles.dob}, '[0-9]{4}')::int BETWEEN ${minYear} AND ${maxYear})` as SQL
    )
  }

  // Height filter: DB-side compare on a normalized inches expression.
  if (filters.heightMinInches && filters.heightMinInches > 0) {
    // Cast feet'inches" to inches in SQL for comparison.
    conditions.push(
      sql`(
        COALESCE(
          (split_part(${profiles.height}, '''', 1)::int * 12) +
          NULLIF(regexp_replace(split_part(${profiles.height}, '''', 2), '[^0-9].*$', ''), '')::int,
          0
        ) >= ${filters.heightMinInches}
      )` as SQL
    )
  }

  const where = and(...conditions)

  // Count total matching rows for pagination metadata.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(where)

  // Build ORDER BY from the sort key. Height sort needs the inches expression.
  const heightInchesExpr = sql`(
    COALESCE(
      (split_part(${profiles.height}, '''', 1)::int * 12) +
      NULLIF(regexp_replace(split_part(${profiles.height}, '''', 2), '[^0-9].*$', ''), '')::int,
      0
    )
  )`

  let orderBy: SQL
  switch (filters.sort) {
    case "ageAsc":
      orderBy = asc(sql`NULLIF(regexp_extract(${profiles.dob}, '[0-9]{4}'), '')::int DESC NULLS LAST`)
      break
    case "ageDesc":
      orderBy = desc(sql`NULLIF(regexp_extract(${profiles.dob}, '[0-9]{4}'), '')::int ASC NULLS LAST`)
      break
    case "heightAsc":
      orderBy = asc(heightInchesExpr)
      break
    case "heightDesc":
      orderBy = desc(heightInchesExpr)
      break
    case "verifiedFirst":
      orderBy = asc(profiles.approvalStatus)
      break
    default:
      orderBy = desc(profiles.createdAt)
  }

  const rows = await db
    .select()
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset)

  const result: PublicProfile[] = rows.map(({ users: userRow, profiles: profile }) =>
    stripPrivateContact({
      ...toPublicProfile(userRow, profile),
      age: estimateAge(profile.dob),
    })
  )

  return {
    profiles: result,
    total: Number(count),
    page,
    pageSize,
    totalPages: Math.ceil(Number(count) / pageSize),
  }
}

export async function getProfileByUserId(userId: number): Promise<(PublicProfile & { profileId: number }) | undefined> {
  const cached = cacheGet<PublicProfile & { profileId: number }>(PROFILE_KEY(userId))
  if (cached) return cached

  const rows = await db
    .select()
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.userId, userId))
    .limit(1)

  if (rows.length === 0) return undefined
  const { users: userRow, profiles: profile } = rows[0]
  const publicProfile = { ...toPublicProfile(userRow, profile), profileId: profile.id, age: estimateAge(profile.dob) }
  cacheSet(PROFILE_KEY(userId), publicProfile)
  return publicProfile
}

export async function createProfile(userId: number, data: Partial<Profile>): Promise<Profile> {
  const [profile] = await db.insert(profiles).values({ userId, ...data } as Profile).returning()
  invalidateProfileListCaches(userId)
  return profile
}

const PROFILE_PATCH_KEYS = [
  "bio",
  "dob",
  "height",
  "type",
  "gotraSelf",
  "gotraMother",
  "education",
  "currentEducation",
  "profession",
  "companyName",
  "district",
  "community",
  "gender",
  "fatherName",
  "motherName",
  "fatherOccupation",
  "motherOccupation",
  "address",
  "contact",
  "guardianMobile",
  "whatsappNumber",
  "brothers",
  "sisters",
  "familyType",
  "parentsOccupation",
  "hobbies",
  "additionalDetails",
  "visible",
] as const satisfies readonly (keyof Profile)[]

/** Whitelist form/API keys so Drizzle only receives known profile columns. */
export function buildProfilePatch(data: Record<string, unknown>): Partial<Profile> {
  const patch: Partial<Profile> = {}
  for (const key of PROFILE_PATCH_KEYS) {
    if (data[key] !== undefined) {
      ;(patch as Record<string, unknown>)[key] = data[key]
    }
  }
  return patch
}

export async function updateProfile(userId: number, data: Partial<Profile>): Promise<Profile> {
  const [profile] = await db.update(profiles).set(data).where(eq(profiles.userId, userId)).returning()
  invalidateProfileListCaches(userId)
  return profile
}

export async function updateProfileImage(userId: number, imagePath: string): Promise<Profile> {
  return updateProfile(userId, { imagePath })
}

export async function updateProfileCastCertificate(userId: number, castCertificatePath: string): Promise<Profile> {
  return updateProfile(userId, { castCertificatePath })
}

export async function updateApprovalStatus(
  userId: number,
  status: ApprovalStatus,
  visible: boolean,
  featured?: boolean
): Promise<Profile> {
  const patch: Partial<typeof profiles.$inferInsert> = { approvalStatus: status, visible }
  if (featured !== undefined) patch.featured = featured

  const [profile] = await db
    .update(profiles)
    .set(patch)
    .where(eq(profiles.userId, userId))
    .returning()
  invalidateProfileListCaches(userId)
  return profile
}

function invalidateProfileListCaches(userId?: number) {
  if (userId) cacheDelete(PROFILE_KEY(userId))
  cacheDelete(APPROVED_PROFILES_KEY)
  cacheDelete(FEATURED_PROFILES_KEY)
  cacheDelete(PENDING_PROFILES_KEY)
  cacheDelete(REJECTED_PROFILES_KEY)
  cacheDelete(ALL_PROFILES_KEY)
  cacheDeletePattern("stats:")
}

export async function updateProfilePublicDisplay(
  userId: number,
  patch: { visible?: boolean; featured?: boolean }
): Promise<Profile> {
  const [profile] = await db
    .update(profiles)
    .set(patch)
    .where(eq(profiles.userId, userId))
    .returning()
  invalidateProfileListCaches(userId)
  return profile
}

export async function hideAllSeedProfiles(): Promise<number> {
  const rows = await db
    .update(profiles)
    .set({ visible: false, featured: false })
    .where(eq(profiles.isSeed, true))
    .returning({ id: profiles.id })
  invalidateProfileListCaches()
  return rows.length
}

export async function getPublicDisplayStats(): Promise<PublicDisplayStats> {
  const rows = await db
    .select({
      visible: profiles.visible,
      isSeed: profiles.isSeed,
      featured: profiles.featured,
    })
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(and(eq(profiles.approvalStatus, "APPROVED"), eq(users.role, "USER")))

  let publicTotal = 0
  let publicSeed = 0
  let publicReal = 0
  let featuredCount = 0
  let approvedReal = 0

  for (const row of rows) {
    if (!row.isSeed) approvedReal++
    if (row.featured && row.visible) featuredCount++
    if (!row.visible) continue
    publicTotal++
    if (row.isSeed) publicSeed++
    else publicReal++
  }

  return { publicTotal, publicSeed, publicReal, featuredCount, approvedReal }
}

export async function listApprovedProfiles(): Promise<PublicProfile[]> {
  const cached = cacheGet<PublicProfile[]>(APPROVED_PROFILES_KEY)
  if (cached) return cached

  const rows = await db
    .select()
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(
      and(
        eq(profiles.visible, true),
        eq(profiles.approvalStatus, "APPROVED"),
        eq(profiles.isSeed, false),
        eq(users.role, "USER")
      )
    )

  const result = rows.map(({ users: userRow, profiles: profile }) => ({
    ...toPublicProfile(userRow, profile),
    age: estimateAge(profile.dob),
  }))
  cacheSet(APPROVED_PROFILES_KEY, result, 1000 * 60 * 2)
  return result
}

/** Home-page featured section — only real (non-seed) approved profiles with images. */
export async function listFeaturedProfiles(limit = 3): Promise<PublicProfile[]> {
  const cached = cacheGet<PublicProfile[]>(FEATURED_PROFILES_KEY)
  if (cached) return cached.slice(0, limit)

  const baseWhere = and(
    eq(profiles.visible, true),
    eq(profiles.approvalStatus, "APPROVED"),
    eq(profiles.isSeed, false),   // never show seed profiles on home page
    eq(users.role, "USER")
  )

  // Admin-featured real profiles first
  const featuredRows = await db
    .select()
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(and(baseWhere, eq(profiles.featured, true)))
    .orderBy(desc(profiles.updatedAt))

  const picked = featuredRows
    .map(({ users: userRow, profiles: profile }) => ({
      ...toPublicProfile(userRow, profile),
      age: estimateAge(profile.dob),
    }))
    .filter((p) => p.imageUrl)

  if (picked.length >= limit) {
    cacheSet(FEATURED_PROFILES_KEY, picked, 1000 * 60 * 2)
    return picked.slice(0, limit)
  }

  // Backfill with non-featured real profiles that have a photo
  const fillerRows = await db
    .select()
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(and(baseWhere, eq(profiles.featured, false)))
    .orderBy(desc(profiles.updatedAt))

  const seen = new Set(picked.map((p) => p.userId))
  const filler = fillerRows
    .map(({ users: userRow, profiles: profile }) => ({
      ...toPublicProfile(userRow, profile),
      age: estimateAge(profile.dob),
    }))
    .filter((p) => !seen.has(p.userId) && p.imageUrl)

  const result = [...picked, ...filler].slice(0, limit)
  cacheSet(FEATURED_PROFILES_KEY, result, 1000 * 60 * 2)
  return result
}

export async function listPendingProfiles(): Promise<PublicProfile[]> {
  const cached = cacheGet<PublicProfile[]>(PENDING_PROFILES_KEY)
  if (cached) return cached

  const rows = await db
    .select()
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(
      and(
        // Show both SENT (just registered) and PENDING (submitted for review)
        // so admin can see all new registrations awaiting payment verification.
        or(
          eq(profiles.approvalStatus, "PENDING"),
          eq(profiles.approvalStatus, "SENT")
        ),
        eq(profiles.isSeed, false),
        eq(users.role, "USER"),
        isNull(users.deletedAt)
      )
    )
    .orderBy(desc(profiles.createdAt))

  const result = rows.map(({ users: userRow, profiles: profile }) => toPublicProfile(userRow, profile))
  cacheSet(PENDING_PROFILES_KEY, result, 1000 * 60 * 2)
  return result
}

export async function listRejectedProfiles(): Promise<PublicProfile[]> {
  const cached = cacheGet<PublicProfile[]>(REJECTED_PROFILES_KEY)
  if (cached) return cached

  const rows = await db
    .select()
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(
      and(
        eq(profiles.approvalStatus, "REJECTED"),
        eq(profiles.isSeed, false),
        eq(users.role, "USER"),
        isNull(users.deletedAt)
      )
    )

  const result = rows.map(({ users: userRow, profiles: profile }) => toPublicProfile(userRow, profile))
  cacheSet(REJECTED_PROFILES_KEY, result, 1000 * 60 * 2)
  return result
}

export async function listAllProfiles(): Promise<PublicProfile[]> {
  const cached = cacheGet<PublicProfile[]>(ALL_PROFILES_KEY)
  if (cached) return cached

  const rows = await db
    .select()
    .from(profiles)
    .leftJoin(users, eq(profiles.userId, users.id))
    .where(
      and(
        eq(profiles.isSeed, false),
        eq(users.role, "USER"),
        isNull(users.deletedAt)     // exclude soft-deleted users
      )
    )
    .orderBy(desc(profiles.createdAt))

  const result = rows.map(({ users: userRow, profiles: profile }) => ({
    ...toPublicProfile(userRow, profile),
    age: estimateAge(profile.dob),
  }))
  cacheSet(ALL_PROFILES_KEY, result, 1000 * 60 * 2)
  return result
}
