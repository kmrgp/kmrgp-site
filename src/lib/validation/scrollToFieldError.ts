/**
 * Scroll to the first invalid field and focus it (native form UX).
 */
export function scrollToFirstFieldError(
  errors: Record<string, string | undefined>,
  order: readonly string[],
  attr = "data-form-field"
): void {
  const first = order.find((key) => errors[key])
  if (!first) return

  // Wait for React to paint error messages / borders.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const root = document.querySelector(`[${attr}="${first}"]`)
      if (!root) return

      root.scrollIntoView({ behavior: "smooth", block: "center" })

      const focusable = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), button:not([disabled]), [role="combobox"], textarea, select'
      )
      focusable?.focus({ preventScroll: true })
    })
  })
}
