import { asc, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { cacheGet, cacheSet } from "@/lib/cache"

const ADMIN_PHONE_KEY = "site:admin_phone"

/** Public admin helpline for contact mediation (env override, else first admin account). */
export async function getAdminContactPhone(): Promise<string | null> {
  const fromEnv = process.env.ADMIN_CONTACT_PHONE ?? process.env.NEXT_PUBLIC_ADMIN_PHONE
  if (fromEnv?.trim()) return fromEnv.replace(/\D/g, "")

  const cached = cacheGet<string | null>(ADMIN_PHONE_KEY)
  if (cached !== undefined) return cached

  const [row] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(or(eq(users.role, "SUPER_ADMIN"), eq(users.role, "ADMIN")))
    .orderBy(asc(users.role))
    .limit(1)

  const phone = row?.phone?.replace(/\D/g, "") ?? null
  cacheSet(ADMIN_PHONE_KEY, phone, 1000 * 60 * 10)
  return phone
}
