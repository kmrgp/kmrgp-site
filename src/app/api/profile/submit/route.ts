import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { getProfileByUserId, updateProfile } from "@/lib/services/profileService"

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }

  const profile = await getProfileByUserId(session.id)
  if (!profile) {
    return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 })
  }

  if (profile.approvalStatus !== "SENT") {
    return NextResponse.json({ success: false, error: "Approval has already been requested." }, { status: 400 })
  }

  await updateProfile(session.id, { approvalStatus: "PENDING" })
  revalidatePath("/dashboard")
  return NextResponse.json({ success: true })
}
