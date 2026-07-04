import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { getProfileByUserId, updateProfile } from "@/lib/services/profileService"

const SUBMITTABLE_STATUSES = new Set(["SENT", "REJECTED"])

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }

  const profile = await getProfileByUserId(session.id)
  if (!profile) {
    return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 })
  }

  if (!SUBMITTABLE_STATUSES.has(profile.approvalStatus)) {
    return NextResponse.json(
      { success: false, error: "Approval has already been requested or your profile is verified." },
      { status: 400 }
    )
  }

  await updateProfile(session.id, { approvalStatus: "PENDING" })
  const updated = await getProfileByUserId(session.id)
  revalidatePath("/dashboard")
  return NextResponse.json({ success: true, profile: updated })
}
