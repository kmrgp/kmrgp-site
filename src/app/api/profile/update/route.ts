import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { getProfileByUserId, updateProfile } from "@/lib/services/profileService"
import { updateUserUsername } from "@/lib/services/userService"
import type { ProfileType } from "@/types"

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }

  const profile = await getProfileByUserId(session.id)
  if (!profile) {
    return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { username, visible, type, ...rest } = body

  if (username !== undefined) {
    await updateUserUsername(session.id, String(username).trim())
  }

  const patch: Record<string, unknown> = { ...rest }
  if (visible !== undefined) patch.visible = visible
  if (type !== undefined) patch.type = type as ProfileType

  if (Object.keys(patch).length > 0) {
    await updateProfile(session.id, patch)
  }

  revalidatePath("/dashboard")
  return NextResponse.json({ success: true })
}
