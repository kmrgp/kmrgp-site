/**
 * Bearer token session helper for /api/v1/* Route Handlers.
 *
 * The website uses HTTP-only cookies (src/lib/auth/session.ts).
 * React Native cannot use httpOnly cookies, so mobile API routes use
 * Authorization: Bearer <jwt> instead.
 *
 * This module replicates the exact same JWT verification logic as
 * getSession() but reads from the Authorization header rather than a cookie.
 * The JWT format is identical — same secret, same algorithm, same payload.
 *
 * NEVER import `cookies` or Next.js server-only modules here.
 * This file must work in both Route Handler and Server Action contexts.
 */

import { jwtVerify, SignJWT } from "jose"
import { getUserById } from "@/lib/services/userService"
import type { SessionUser, Role } from "@/types"

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not configured")
  return new TextEncoder().encode(secret)
}

/**
 * Mint a JWT token suitable for mobile Bearer auth.
 * Same format as createSession() but does NOT set a cookie.
 * Returns the raw token string for the mobile client to store securely.
 */
export async function mintBearerToken(
  userId: number,
  role: Role,
  phone: string,
  username: string | null,
  isApproved: boolean
): Promise<string> {
  return new SignJWT({ userId, role, phone, username, isApproved })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())
}

/**
 * Verify a Bearer token from the Authorization header and return a
 * fresh SessionUser by re-fetching from the database.
 *
 * Returns null if:
 * - No Authorization header present
 * - Token is malformed or expired
 * - User not found or soft-deleted
 */
export async function getSessionFromBearer(req: Request): Promise<SessionUser | null> {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null

  const token = auth.slice(7).trim()
  if (!token) return null

  let secret: Uint8Array
  try {
    secret = getSecret()
  } catch {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
    const raw = payload as Record<string, unknown>
    // Support both `id` and `userId` claim names for forward-compat
    const userId =
      typeof raw.userId === "number" ? raw.userId :
      typeof raw.id === "number" ? raw.id : null

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

/**
 * Require authentication. Returns the session or throws a 401 Response.
 * Use inside Route Handlers:
 *
 *   const session = await requireAuth(req)
 *   // if we got here, session is guaranteed non-null
 */
export async function requireAuth(req: Request): Promise<SessionUser> {
  const session = await getSessionFromBearer(req)
  if (!session) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required")
  }
  return session
}

/**
 * Require ADMIN or SUPER_ADMIN role.
 */
export async function requireAdmin(req: Request): Promise<SessionUser> {
  const session = await requireAuth(req)
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Admin access required")
  }
  return session
}

/**
 * Require SUPER_ADMIN role.
 */
export async function requireSuperAdmin(req: Request): Promise<SessionUser> {
  const session = await requireAuth(req)
  if (session.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Super admin access required")
  }
  return session
}

// ---------------------------------------------------------------------------
// Structured error class — caught by the route handler wrappers below
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}
