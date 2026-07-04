import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { deleteSession } from "@/lib/auth/session"

export async function POST() {
  await deleteSession()
  revalidatePath("/")
  return NextResponse.json({ success: true })
}
