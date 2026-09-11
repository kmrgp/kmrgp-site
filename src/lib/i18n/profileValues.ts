/**
 * Helpers that translate common profile field values.
 *
 * User-entered free text (names, addresses, education, profession, gotra etc.)
 * is always shown as-is — translation of free text is impossible.
 *
 * However, fields that come from dropdown/select inputs in the bio editor
 * (familyType, community, gender, profile type) have a finite set of known
 * values and CAN be translated here.
 */

import type { Lang } from "@/lib/i18n/dictionary"
import { t } from "@/lib/i18n/dictionary"

/**
 * Translate the `familyType` field.
 * Common stored values: "Joint Family", "Nuclear Family", "-", null
 */
export function translateFamilyType(value: string | null, lang: Lang): string {
  if (!value || value === "-") return "—"
  const v = value.trim().toLowerCase()
  if (v === "joint family" || v === "joint") return t(lang, "profile.familyType.joint")
  if (v === "nuclear family" || v === "nuclear") return t(lang, "profile.familyType.nuclear")
  // Unknown value — return as-is so nothing breaks
  return value
}

/**
 * Translate the `community` field.
 * Common values: "Mewada", "Rajput"
 */
export function translateCommunity(value: string | null, lang: Lang): string {
  if (!value || value === "-") return "—"
  const v = value.trim().toLowerCase()
  if (v === "mewada") return t(lang, "profile.community.mewada")
  if (v === "rajput") return t(lang, "profile.community.rajput")
  return value
}

/**
 * Translate the `type` field (GROOM / BRIDE).
 */
export function translateProfileType(type: "GROOM" | "BRIDE", lang: Lang): string {
  return type === "GROOM" ? t(lang, "profile.type.groom") : t(lang, "profile.type.bride")
}

/**
 * Translate the `gender` field.
 * Common stored values: "Male", "Female", "Groom", "Bride", null
 */
export function translateGender(value: string | null, lang: Lang): string {
  if (!value || value === "-") return "—"
  const v = value.trim().toLowerCase()
  if (v === "male" || v === "groom") return t(lang, "profile.gender.male")
  if (v === "female" || v === "bride") return t(lang, "profile.gender.female")
  return value
}

/**
 * Display a fallback dash for empty/missing values.
 */
export function displayValue(value: string | null | undefined): string {
  if (!value || value.trim() === "-" || value.trim() === "") return "—"
  return value
}
