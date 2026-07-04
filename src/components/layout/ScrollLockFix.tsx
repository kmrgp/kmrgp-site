"use client"

import { useEffect } from "react"

const OVERRIDE_ID = "kmrgp-scroll-lock-override"

const OVERRIDE_CSS = `
  body[data-scroll-locked] {
    margin-right: 0 !important;
    margin-left: 0 !important;
    padding-right: 0 !important;
    padding-left: 0 !important;
    --removed-body-scroll-bar-size: 0px !important;
  }
`

/**
 * Radix/react-remove-scroll pads the body when modals open, which shifts fixed
 * headers and backgrounds. With scrollbar-gutter: stable on html we do not need
 * that compensation — this override wins the cascade after their injected style.
 */
export function ScrollLockFix() {
  useEffect(() => {
    const body = document.body

    let override = document.getElementById(OVERRIDE_ID) as HTMLStyleElement | null
    if (!override) {
      override = document.createElement("style")
      override.id = OVERRIDE_ID
      override.textContent = OVERRIDE_CSS
      document.head.appendChild(override)
    }

    const pinOverride = () => {
      if (override?.parentNode) {
        document.head.appendChild(override)
      }
    }

    const clearInline = () => {
      body.style.removeProperty("margin-right")
      body.style.removeProperty("margin-left")
      body.style.removeProperty("padding-right")
      body.style.removeProperty("padding-left")
    }

    const apply = () => {
      if (body.hasAttribute("data-scroll-locked")) {
        pinOverride()
        body.style.setProperty("margin-right", "0px", "important")
        body.style.setProperty("margin-left", "0px", "important")
        body.style.setProperty("padding-right", "0px", "important")
        body.style.setProperty("padding-left", "0px", "important")
      } else {
        clearInline()
      }
    }

    const observer = new MutationObserver(() => {
      apply()
      requestAnimationFrame(apply)
    })

    observer.observe(body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked", "style", "class"],
    })

    apply()

    return () => {
      observer.disconnect()
      clearInline()
      override?.remove()
    }
  }, [])

  return null
}
