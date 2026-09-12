/**
 * POST /api/v1/profile/upload
 *
 * Upload profile photo or cast certificate for the authenticated user.
 * Wraps the existing /api/profile/upload logic with Bearer auth.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   Content-Type: multipart/form-data
 *
 * FormData fields:
 *   file   File    — image (photo) or image/PDF (cast certificate)
 *   kind   string  — "photo" (default) or "cast"
 *
 * Constraints:
 *   - Photo: image/* only, max 10 MB
 *   - Cast certificate: image/* or application/pdf, max 10 MB
 *
 * Success 201:
 *   Photo: { "success": true, "data": { "imageUrl": string, "kind": "photo" } }
 *   Cast:  { "success": true, "data": { "fileUrl": string, "kind": "cast" } }
 */

import { requireAuth } from "@/lib/api/bearer"
import { ok, created, badRequest, withErrorHandling } from "@/lib/api/response"
import { uploadToR2, deleteFromR2, isR2Configured, keyFromUrl } from "@/lib/storage/r2"
import { updateProfileImage, updateProfileCastCertificate, getProfileByUserId } from "@/lib/services/profileService"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { randomBytes } from "crypto"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads")
const MAX_BYTES = 10 * 1024 * 1024

export const POST = withErrorHandling(async (req) => {
  const session = await requireAuth(req)

  const formData = await req.formData().catch(() => null)
  if (!formData) return badRequest("Expected multipart/form-data")

  const file = formData.get("file") as File | null
  const kind = (formData.get("kind") as string | null)?.trim() ?? "photo"

  if (!file) return badRequest("file is required")
  if (kind !== "photo" && kind !== "cast") return badRequest("kind must be 'photo' or 'cast'")

  if (kind === "photo" && !file.type.startsWith("image/")) {
    return badRequest("Photo must be an image file")
  }
  if (kind === "cast" && !file.type.startsWith("image/") && file.type !== "application/pdf") {
    return badRequest("Cast certificate must be an image or PDF")
  }
  if (file.size > MAX_BYTES) return badRequest("File too large (max 10 MB)")

  const ext = file.name.split(".").pop()?.toLowerCase() || (file.type === "application/pdf" ? "pdf" : "jpg")
  const prefix = kind === "photo" ? "upload" : "cast"
  const filename = `${prefix}_${randomBytes(8).toString("hex")}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  // Delete old file
  const profile = await getProfileByUserId(session.id)
  const oldPath = kind === "photo" ? profile?.imageUrl : profile?.castCertificateUrl
  if (oldPath) {
    if (oldPath.startsWith("http")) {
      deleteFromR2(keyFromUrl(oldPath)).catch(() => {})
    } else {
      unlink(join(UPLOAD_DIR, oldPath)).catch(() => {})
    }
  }

  let storedPath: string
  let publicUrl: string

  if (isR2Configured) {
    publicUrl = await uploadToR2(filename, bytes, file.type)
    storedPath = publicUrl
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true })
    await writeFile(join(UPLOAD_DIR, filename), bytes)
    publicUrl = `/api/profile/image/${filename}`
    storedPath = filename
  }

  if (kind === "photo") {
    await updateProfileImage(session.id, storedPath)
    return created({ imageUrl: publicUrl, kind: "photo" })
  } else {
    await updateProfileCastCertificate(session.id, storedPath)
    return created({ fileUrl: publicUrl, kind: "cast" })
  }
})
