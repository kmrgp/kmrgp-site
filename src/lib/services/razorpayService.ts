import { createHmac } from "crypto"

const KEY_ID = process.env.RAZORPAY_KEY_ID
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET)
}

export function getRazorpayKeyId(): string {
  if (!KEY_ID) throw new Error("RAZORPAY_KEY_ID is not configured")
  return KEY_ID
}

interface RazorpayOrderResponse {
  id: string
  amount: number
  currency: string
  status: string
}

export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  notes?: Record<string, string>
): Promise<RazorpayOrderResponse> {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error("Razorpay is not configured")
  }

  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: notes ?? {},
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Razorpay order failed: ${err}`)
  }

  return res.json() as Promise<RazorpayOrderResponse>
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!KEY_SECRET) return false
  const expected = createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")
  return expected === signature
}
