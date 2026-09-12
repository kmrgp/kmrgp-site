/**
 * Standardized JSON response helpers for /api/v1/* Route Handlers.
 *
 * All mobile API responses follow this envelope:
 *
 * Success:
 *   { "success": true,  "data": {...}, "message": "..." }
 *
 * Error:
 *   { "success": false, "error": { "code": "...", "message": "..." } }
 *
 * Use the exported helpers rather than constructing NextResponse manually
 * so the format stays consistent across all endpoints.
 */

import { NextResponse } from "next/server"
import { ApiError } from "./bearer"

// ---------------------------------------------------------------------------
// Success responses
// ---------------------------------------------------------------------------

export function ok<T>(data: T, message?: string, status = 200): NextResponse {
  return NextResponse.json({ success: true, data, message: message ?? null }, { status })
}

export function created<T>(data: T, message?: string): NextResponse {
  return ok(data, message, 201)
}

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

export function errorResponse(
  status: number,
  code: string,
  message: string
): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  )
}

export function badRequest(message: string, code = "BAD_REQUEST"): NextResponse {
  return errorResponse(400, code, message)
}

export function unauthorized(message = "Authentication required"): NextResponse {
  return errorResponse(401, "UNAUTHORIZED", message)
}

export function forbidden(message = "Access denied"): NextResponse {
  return errorResponse(403, "FORBIDDEN", message)
}

export function notFound(message = "Resource not found"): NextResponse {
  return errorResponse(404, "NOT_FOUND", message)
}

export function conflict(message: string, code = "CONFLICT"): NextResponse {
  return errorResponse(409, code, message)
}

export function serverError(message = "Internal server error"): NextResponse {
  return errorResponse(500, "INTERNAL_ERROR", message)
}

// ---------------------------------------------------------------------------
// Route handler wrapper — catches ApiError automatically
// ---------------------------------------------------------------------------

type RouteHandler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

/**
 * Wrap a route handler so any thrown ApiError is automatically converted
 * to a structured JSON error response. All other errors return 500.
 *
 * Usage:
 *   export const GET = withErrorHandling(async (req) => {
 *     const session = await requireAuth(req)
 *     ...
 *   })
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof ApiError) {
        return errorResponse(err.status, err.code, err.message)
      }
      // Never expose internal details
      console.error("[API Error]", err)
      return serverError()
    }
  }
}
