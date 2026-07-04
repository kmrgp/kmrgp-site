"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import {
  listSubscriptionPlans,
  upsertSubscriptionPlan,
  setPlanActive,
  setDefaultPlan,
  type PlanInput,
} from "@/lib/services/subscriptionPlanService"

async function requireAdmin() {
  const session = await getSession()
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return null
  }
  return session
}

export async function listSubscriptionPlansAction() {
  const session = await requireAdmin()
  if (!session) return { success: false, error: "Forbidden" }
  const plans = await listSubscriptionPlans()
  return { success: true, plans }
}

export async function saveSubscriptionPlanAction(id: number | null, input: PlanInput) {
  const session = await requireAdmin()
  if (!session) return { success: false, error: "Forbidden" }

  if (!input.name?.trim()) return { success: false, error: "Plan name is required." }
  if (input.amountInr < 0) return { success: false, error: "Amount cannot be negative." }
  if (input.durationDays < 1) return { success: false, error: "Duration must be at least 1 day." }

  const plan = await upsertSubscriptionPlan(id, input)
  revalidatePath("/dashboard")
  return { success: true, plan }
}

export async function togglePlanActiveAction(id: number, active: boolean) {
  const session = await requireAdmin()
  if (!session) return { success: false, error: "Forbidden" }
  await setPlanActive(id, active)
  revalidatePath("/dashboard")
  return { success: true }
}

export async function setDefaultPlanAction(id: number) {
  const session = await requireAdmin()
  if (!session) return { success: false, error: "Forbidden" }
  await setDefaultPlan(id)
  revalidatePath("/dashboard")
  return { success: true }
}
