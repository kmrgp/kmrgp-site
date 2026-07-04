"use client"

import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthGatePanel } from "@/components/auth/AuthGatePanel"
import { useLang } from "@/lib/i18n/LanguageProvider"

export function ProfileAccessLocked({ kind }: { kind: "noSession" | "pending" }) {
  const { t } = useLang()
  if (kind === "noSession") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6 pt-[76px]">
        <AuthGatePanel />
      </div>
    )
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 pt-[76px]">
      <div className="max-w-lg rounded-3xl border-2 border-dashed border-gold bg-white p-10 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-gold" />
        <h2 className="type-h2 mb-2">{t("dash.verificationPending")}</h2>
        <p className="type-body-sm mb-6 text-muted-foreground">{t("dash.verificationDesc")}</p>
        <Button asChild className="w-full">
          <Link href="/dashboard">{t("dash.goDashboard")}</Link>
        </Button>
      </div>
    </div>
  )
}
