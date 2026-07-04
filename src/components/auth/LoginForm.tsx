"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/FieldError"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { loginAction } from "@/lib/actions/auth"
import { normalizeIndianMobile, formatIndianMobile } from "@/lib/validation/phone"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { AuthPageShell } from "@/components/auth/AuthPageShell"
import { validateLoginFields, LOGIN_FIELD_ORDER } from "@/lib/validation/authForm"
import { scrollToFirstFieldError } from "@/lib/validation/scrollToFieldError"
import type { DictKey } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils"

export function LoginForm() {
  const { t, tEn } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({})

  const redirectTo = searchParams.get("redirect") ?? "/dashboard"
  const regToastShown = useRef(false)

  useEffect(() => {
    if (searchParams.get("registered") !== "1" || regToastShown.current) return
    regToastShown.current = true
    toast.success(t("auth.regSuccess"), { id: "reg-success" })

    const params = new URLSearchParams()
    const redirect = searchParams.get("redirect")
    if (redirect) params.set("redirect", redirect)
    const qs = params.toString()
    router.replace(qs ? `/login?${qs}` : "/login", { scroll: false })
  }, [searchParams, router, t])

  function errMsg(key?: string) {
    return key ? t(key as DictKey) : undefined
  }

  function looksLikeLoginPhone(value: string): boolean {
    const trimmed = value.trim()
    return trimmed.length > 0 && !/[a-zA-Z]/.test(trimmed)
  }

  function handleLoginIdChange(value: string) {
    if (value && !/[a-zA-Z]/.test(value)) {
      setLoginId(formatIndianMobile(normalizeIndianMobile(value)))
      return
    }
    setLoginId(value)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    const validation = validateLoginFields(loginId, password)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      scrollToFirstFieldError(validation, LOGIN_FIELD_ORDER)
      return
    }

    setErrors({})
    setPending(true)
    const loginValue = looksLikeLoginPhone(loginId)
      ? normalizeIndianMobile(loginId)
      : loginId.trim()
    const res = await loginAction(loginValue, password)
    setPending(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(t("auth.loginSuccess"))
    const safeRedirect =
      redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard"
    router.push(safeRedirect)
    router.refresh()
  }

  return (
    <AuthPageShell
      title={t("auth.tabLogin")}
      description={t("auth.desc")}
      alternate={{ href: "/signup", label: t("auth.switchToSignup") }}
    >
      <form onSubmit={handleLogin} noValidate className="space-y-4">
        <div className="space-y-2" data-form-field="phone">
          <Label htmlFor="login-phone">{t("auth.loginIdLabel")}</Label>
          <Input
            id="login-phone"
            value={loginId}
            onChange={(e) => {
              handleLoginIdChange(e.target.value)
              setErrors((prev) => ({ ...prev, phone: undefined }))
            }}
            placeholder={tEn("auth.loginIdPh")}
            autoComplete="username"
            inputMode="text"
            className={cn(errors.phone && "border-destructive focus:border-destructive focus:ring-red-100")}
            aria-invalid={!!errors.phone}
          />
          <FieldError message={errMsg(errors.phone)} />
        </div>
        <div className="space-y-2" data-form-field="password">
          <Label htmlFor="login-password">{t("auth.password")}</Label>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            placeholder={tEn("auth.passwordPh")}
            autoComplete="current-password"
            className={cn(errors.password && "border-destructive focus:border-destructive focus:ring-red-100")}
            aria-invalid={!!errors.password}
          />
          <FieldError message={errMsg(errors.password)} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("auth.verifying") : t("auth.accessDashboard")}
        </Button>
      </form>
    </AuthPageShell>
  )
}
