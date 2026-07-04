import type { DictKey } from "@/lib/i18n/dictionary"

/** Map known server/action error strings to i18n keys. */
const ERROR_KEY_MAP: Record<string, DictKey> = {
  "Invalid mobile number or password.": "auth.err.invalidLogin",
  "Mobile number is already registered.": "auth.err.phoneTaken",
  "Password must be at least 6 characters.": "auth.err.password",
  "A valid 10-digit Indian mobile number is required.": "auth.err.mobile",
  "Registration requires payment. Please complete checkout on the signup form.": "auth.err.paymentRequired",
  "Payment gateway is not configured.": "auth.err.paymentGateway",
  "Please fill all required fields (password min 6 characters).": "auth.err.password",
  "Payment verification failed.": "auth.err.paymentVerifyFailed",
  "Phone must be at least 10 digits.": "auth.err.phoneDigits",
  "Not authenticated": "errors.notAuthenticated",
  Forbidden: "errors.forbidden",
  "Profile not found": "errors.profileNotFound",
  "Approval has already been requested or your profile is verified.": "errors.approvalAlreadyRequested",
  "Cannot request your own contact.": "errors.cannotRequestOwnContact",
  "Profile must be admin-approved before it can be shown publicly.": "errors.visibilityNotApproved",
  "Nothing to update": "errors.nothingToUpdate",
  "Invalid JSON": "errors.invalidJson",
  Unauthorized: "errors.uploadUnauthorized",
  "No file provided": "errors.uploadNoFile",
  "Invalid file type": "errors.uploadInvalidType",
  "File too large (max 10 MB)": "errors.uploadTooLarge",
  "Plan name is required.": "admin.err.planNameRequired",
  "Amount cannot be negative.": "admin.err.amountNegative",
  "Duration must be at least 1 day.": "admin.err.durationMin",
  "No active subscription plan configured.": "subscription.err.noPlan",
  "Invalid plan amount.": "subscription.err.invalidAmount",
  "Order not found.": "subscription.err.orderNotFound",
  "Plan not found.": "subscription.err.planNotFound",
}

export function resolveActionError(
  error: string | undefined,
  t: (key: DictKey) => string
): string {
  if (!error?.trim()) return t("errors.generic")
  const key = ERROR_KEY_MAP[error.trim()]
  return key ? t(key) : error
}

export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path) return fallback
  const trimmed = path.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback
  return trimmed
}
