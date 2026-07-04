"use server"

import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { getUserById } from "@/lib/services/userService"
import type { SessionUser, Role } from "@/types"

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }
  return new TextEncoder().encode(secret)
}

export async function createSession(userId: number, role: Role, phone: string, username: string | null, isApproved: boolean) {
  const token = await new SignJWT({ userId, role, phone, username, isApproved })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  let secret: Uint8Array
  try {
    secret = getSecret()
  } catch {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
    // Tokens encode the user id as `userId`; normalize to the SessionUser shape.
    const raw = payload as Record<string, unknown>
    const userId = typeof raw.id === "number" ? raw.id : typeof raw.userId === "number" ? raw.userId : null
    if (userId === null) return null

    const user = await getUserById(userId)
    if (!user) return null

    return {
      id: user.id,
      role: user.role as Role,
      phone: user.phone,
      username: user.username,
      isApproved: user.isApproved,
    }
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
