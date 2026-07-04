/** Indian mobile: 10 digits, leading 6–9. */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "")
}

/** Strip +91 / leading 0; keep last 10 digit body. */
export function normalizeIndianMobile(input: string): string {
  let d = digitsOnly(input)
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2)
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1)
  if (d.length > 10) d = d.slice(-10)
  return d.slice(0, 10)
}

/** Display as `98765 43210`. */
export function formatIndianMobile(input: string): string {
  const d = normalizeIndianMobile(input)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)} ${d.slice(5)}`
}

export function isValidIndianMobile(input: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(input))
}
