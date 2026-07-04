import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import {
  updateProfileImage,
  updateProfileCastCertificate,
  getProfileByUserId,
} from "@/lib/services/profileService"
import { uploadToR2, deleteFromR2, isR2Configured, keyFromUrl } from "@/lib/storage/r2"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { randomBytes } from "crypto"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads")
const MAX_BYTES = 10 * 1024 * 1024

type UploadKind = "photo" | "cast"

function isAllowedFile(file: File, kind: UploadKind) {
  if (kind === "photo") return file.type.startsWith("image/")
  return file.type.startsWith("image/") || file.type === "application/pdf"
}

async function deleteOldFile(url: string | null | undefined) {
  if (!url) return
  if (url.startsWith("http")) {
    try {
      await deleteFromR2(keyFromUrl(url))
    } catch {
      // best-effort
    }
    return
  }
  try {
    const oldFilename = url.split("/").pop()
    if (oldFilename) {
      await unlink(join(UPLOAD_DIR, oldFilename)).catch(() => {})
    }
  } catch {
    // ignore
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const kind = (formData.get("kind") as UploadKind | null) ?? "photo"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (!isAllowedFile(file, kind)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() || (kind === "cast" && file.type === "application/pdf" ? "pdf" : "jpg")
  const prefix = kind === "cast" ? "cast_" : "upload_"
  const filename = `${prefix}${randomBytes(8).toString("hex")}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const profile = await getProfileByUserId(session.id)

  if (kind === "photo") {
    await deleteOldFile(profile?.imageUrl)
  } else {
    await deleteOldFile(profile?.castCertificateUrl)
  }

  let fileUrl: string
  let storedPath: string

  if (isR2Configured) {
    fileUrl = await uploadToR2(filename, bytes, file.type)
    storedPath = fileUrl
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true })
    await writeFile(join(UPLOAD_DIR, filename), bytes)
    fileUrl = `/api/profile/image/${filename}`
    storedPath = filename
  }

  if (kind === "cast") {
    await updateProfileCastCertificate(session.id, storedPath)
    return NextResponse.json({ success: true, fileUrl, kind }, { status: 201 })
  }

  await updateProfileImage(session.id, storedPath)
  return NextResponse.json({ success: true, imageUrl: fileUrl, kind }, { status: 201 })
}
