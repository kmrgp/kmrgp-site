import { eq, and, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { subscriptionPlans, type SubscriptionPlan } from "@/lib/db/schema"

export interface PlanInput {
  name: string
  description?: string
  amountInr: number
  durationDays: number
  active?: boolean
  isDefault?: boolean
}

export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return db.select().from(subscriptionPlans).orderBy(desc(subscriptionPlans.isDefault), desc(subscriptionPlans.id))
}

export async function getDefaultActivePlan(): Promise<SubscriptionPlan | undefined> {
  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(and(eq(subscriptionPlans.active, true), eq(subscriptionPlans.isDefault, true)))
    .limit(1)
  if (plan) return plan

  const [fallback] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.active, true))
    .orderBy(desc(subscriptionPlans.id))
    .limit(1)
  return fallback
}

export async function getPlanById(id: number): Promise<SubscriptionPlan | undefined> {
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1)
  return plan
}

export async function upsertSubscriptionPlan(id: number | null, input: PlanInput): Promise<SubscriptionPlan> {
  if (input.isDefault) {
    await db.update(subscriptionPlans).set({ isDefault: false })
  }

  if (id) {
    const [plan] = await db
      .update(subscriptionPlans)
      .set({
        name: input.name,
        description: input.description ?? "",
        amountInr: input.amountInr,
        durationDays: input.durationDays,
        active: input.active ?? true,
        isDefault: input.isDefault ?? false,
      })
      .where(eq(subscriptionPlans.id, id))
      .returning()
    return plan
  }

  const [plan] = await db
    .insert(subscriptionPlans)
    .values({
      name: input.name,
      description: input.description ?? "",
      amountInr: input.amountInr,
      durationDays: input.durationDays,
      active: input.active ?? true,
      isDefault: input.isDefault ?? false,
    })
    .returning()
  return plan
}

export async function setPlanActive(id: number, active: boolean): Promise<void> {
  await db.update(subscriptionPlans).set({ active }).where(eq(subscriptionPlans.id, id))
}

export async function setDefaultPlan(id: number): Promise<void> {
  await db.update(subscriptionPlans).set({ isDefault: false })
  await db.update(subscriptionPlans).set({ isDefault: true, active: true }).where(eq(subscriptionPlans.id, id))
}

export async function ensureDefaultPlan(): Promise<void> {
  const existing = await getDefaultActivePlan()
  if (existing) return

  await db.insert(subscriptionPlans).values({
    name: "Yearly Profile",
    description: "One matrimonial profile listing for 1 year",
    amountInr: 501,
    durationDays: 365,
    active: true,
    isDefault: true,
  })
}
