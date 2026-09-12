/**
 * Centralized API client for the KMRGP mobile app.
 *
 * - Reads the base URL from EXPO_PUBLIC_API_URL
 * - Attaches Bearer token from AsyncStorage on every authenticated request
 * - Parses the standard { success, data, error } envelope
 * - Throws ApiCallError on HTTP errors so callers can catch cleanly
 * - Never logs or exposes secrets
 */

import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"
import type { ApiResponse } from "@/types"

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  "https://kmrgp.com/api/v1"

const TOKEN_KEY = "kmrgp_auth_token"
const TIMEOUT_MS = 15_000

// ─── Token storage ────────────────────────────────────────────────────────────

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY)
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class ApiCallError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "ApiCallError"
  }

  get isUnauthorized() {
    return this.status === 401
  }
  get isForbidden() {
    return this.status === 403
  }
  get isNotFound() {
    return this.status === 404
  }
  get isConflict() {
    return this.status === 409
  }
  get isPaymentRequired() {
    return this.status === 402
  }
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  /** Send as multipart/form-data instead of JSON */
  formData?: FormData
  /** Skip attaching the Bearer token */
  public?: boolean
  signal?: AbortSignal
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, formData, signal } = options

  const headers: Record<string, string> = {}

  if (!options.public) {
    const token = await getToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
  }

  if (body !== undefined && !formData) {
    headers["Content-Type"] = "application/json"
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const combinedSignal = signal ?? controller.signal

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: combinedSignal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if ((err as Error)?.name === "AbortError") {
      throw new ApiCallError(0, "TIMEOUT", "Request timed out. Please check your connection.")
    }
    throw new ApiCallError(0, "NETWORK_ERROR", "Network error. Please check your connection.")
  } finally {
    clearTimeout(timeout)
  }

  let parsed: ApiResponse<T>
  try {
    parsed = await response.json()
  } catch {
    throw new ApiCallError(response.status, "PARSE_ERROR", "Unexpected server response.")
  }

  if (!parsed.success) {
    throw new ApiCallError(
      response.status,
      parsed.error.code,
      parsed.error.message
    )
  }

  return parsed.data
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),

  delete: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    apiFetch<T>(path, { ...opts, method: "DELETE", body }),

  upload: <T>(path: string, formData: FormData, opts?: Omit<RequestOptions, "method" | "formData">) =>
    apiFetch<T>(path, { ...opts, method: "POST", formData }),
}
