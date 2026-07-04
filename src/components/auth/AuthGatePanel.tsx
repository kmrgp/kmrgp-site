"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogIn, UserPlus, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLang } from "@/lib/i18n/LanguageProvider"

/** Login + signup links for gated pages (dashboard, profiles). */
export function AuthGatePanel() {
  const { t } = useLang()
  const pathname = usePathname()
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`

  return (
    <div className="max-w-md rounded-3xl border-4 border-double border-maroon bg-white p-10 text-center shadow-lg">
      <Lock className="mx-auto mb-4 h-12 w-12 text-maroon" />
      <h2 className="type-h2 mb-2">{t("dash.accessOnly")}</h2>
      <p className="type-body-sm mb-6 text-muted-foreground">{t("dash.accessDesc")}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={loginHref}>
            <LogIn className="mr-2 h-4 w-4" />
            {t("nav.login")}
          </Link>
        </Button>
        <Button className="flex-1" asChild>
          <Link href="/signup">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("nav.joinParivar")}
          </Link>
        </Button>
      </div>
    </div>
  )
}
