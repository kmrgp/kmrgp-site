import { NextResponse } from "next/server"
import { uploadToR2, deleteFromR2, isR2Configured, keyFromUrl } from "@/lib/storage/r2"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { paymentOrders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads")
const MAX_BYTES = 10 * 1024 * 1024

/**
 * POST /api/payment/screenshot
 *
 * Called immediately after the QR-payment step on the signup form.
 * Does NOT require an authenticated session — the registrant is not yet
 * a user. Authentication is the order reference passed in the form body.
 *
 * FormData fields:
 *   file      — image file (screenshot of UPI payment)
 *   orderRef  — the order reference returned by createRegistrationOrderAction
 */
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const orderRef = (formData.get("orderRef") as string | null)?.trim()

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (!orderRef) {
    return NextResponse.json({ error: "Order reference is required" }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are accepted" }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
  }

  // Verify the order exists and is still PENDING
  const [order] = await db
    .select()
    .from(paymentOrders)
    .where(eq(paymentOrders.orderRef, orderRef))
    .limit(1)

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "This order has already been processed" },
      { status: 409 }
    )
  }

  // Delete any previously uploaded screenshot for this order
  if (order.screenshotPath) {
    const old = order.screenshotPath
    if (old.startsWith("http")) {
      try { await deleteFromR2(keyFromUrl(old)) } catch { /* best-effort */ }
    } else {
      try { await unlink(join(UPLOAD_DIR, old)).catch(() => {}) } catch { /* ignore */ }
    }
  }

  const ext = file.name.split(".").pop() || "jpg"
  const filename = `pay_${randomBytes(8).toString("hex")}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  let storedPath: string
  let fileUrl: string

  if (isR2Configured) {
    fileUrl = await uploadToR2(filename, bytes, file.type)
    storedPath = fileUrl
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true })
    await writeFile(join(UPLOAD_DIR, filename), bytes)
    fileUrl = `/api/profile/image/${filename}`
    storedPath = filename
  }

  // Persist the screenshot path on the order
  await db
    .update(paymentOrders)
    .set({ screenshotPath: storedPath })
    .where(eq(paymentOrders.orderRef, orderRef))

  return NextResponse.json({ success: true, screenshotUrl: fileUrl }, { status: 201 })
}
