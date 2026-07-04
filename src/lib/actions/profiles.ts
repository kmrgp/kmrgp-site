"use server"

import { getSession } from "@/lib/auth/session"
import { listApprovedProfiles, searchProfiles, type ProfileSearchFilters, type ProfileSearchResult } from "@/lib/services/profileService"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function listApprovedProfilesAction(): Promise<{ success: boolean; error?: string; profiles?: any[] }> {
  const session = await getSession()
  if (!session) return { success: false, error: "Not authenticated" }

  const profiles = await listApprovedProfiles()
  return { success: true, profiles }
}

export async function searchProfilesAction(filters: ProfileSearchFilters): Promise<ActionResult<ProfileSearchResult>> {
  const session = await getSession()
  if (!session) return { success: false, error: "Not authenticated" }

  const data = await searchProfiles(filters)
  return { success: true, data }
}