"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { ComponentProps } from "react"

type LogoutButtonProps = Omit<ComponentProps<typeof Button>, "type" | "onClick">

export function LogoutButton({ children, disabled, ...props }: LogoutButtonProps) {
  const { t } = useLang()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Button type="button" onClick={handleLogout} disabled={disabled || pending} {...props}>
      {children ?? t("nav.logout")}
    </Button>
  )
}
