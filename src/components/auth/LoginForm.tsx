"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "@/lib/actions/auth"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { AuthPageShell } from "@/components/auth/AuthPageShell"

export function LoginForm() {
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  const redirectTo = searchParams.get("redirect") ?? "/dashboard"

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success(t("auth.regSuccess"))
    }
  }, [searchParams, t])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await loginAction(phone, password)
    setPending(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(t("auth.loginSuccess"))
    router.push(redirectTo.startsWith("/") ? redirectTo : "/dashboard")
    router.refresh()
  }

  return (
    <AuthPageShell
      title={t("auth.tabLogin")}
      description={t("auth.desc")}
      alternate={{ href: "/signup", label: t("auth.switchToSignup") }}
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-phone">{t("auth.mobile")}</Label>
          <Input
            id="login-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("auth.mobilePh")}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">{t("auth.password")}</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPh")}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("auth.verifying") : t("auth.accessDashboard")}
        </Button>
      </form>
    </AuthPageShell>
  )
}
