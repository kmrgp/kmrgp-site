import { eq, count, and, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { profileViews } from "@/lib/db/schema"
import { cacheDelete, cacheGet, cacheSet } from "@/lib/cache"

const VIEWS_COUNT_KEY = (profileUserId: number) => `profileViews:count:${profileUserId}`

export async function recordProfileView(profileUserId: number, viewerId: number): Promise<void> {
  if (profileUserId === viewerId) return

  await db
    .insert(profileViews)
    .values({ profileUserId, viewerId })
    .onConflictDoNothing({ target: [profileViews.profileUserId, profileViews.viewerId] })

  cacheDelete(VIEWS_COUNT_KEY(profileUserId))
}

export async function countProfileViews(profileUserId: number): Promise<number> {
  const cached = cacheGet<number>(VIEWS_COUNT_KEY(profileUserId))
  if (cached != null) return cached

  const [row] = await db
    .select({ total: count() })
    .from(profileViews)
    .where(and(eq(profileViews.profileUserId, profileUserId), ne(profileViews.viewerId, profileUserId)))

  const total = Number(row?.total ?? 0)
  cacheSet(VIEWS_COUNT_KEY(profileUserId), total)
  return total
}
