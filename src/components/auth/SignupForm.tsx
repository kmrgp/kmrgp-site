"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Camera, Upload, X, CheckCircle2, ArrowLeft, ImageIcon, PartyPopper, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { registerAction } from "@/lib/actions/auth"
import {
  getRegistrationPlanAction,
  createRegistrationOrderAction,
  completeRegistrationAction,
} from "@/lib/actions/payment"
import { loginAction } from "@/lib/actions/auth"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { resolveActionError } from "@/lib/i18n/actionErrors"
import { AuthPageShell } from "@/components/auth/AuthPageShell"
import { DistrictField } from "@/components/ui/DistrictField"
import { PhoneInput } from "@/components/ui/PhoneInput"
import { FieldError } from "@/components/ui/FieldError"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { normalizeDistrictInput } from "@/lib/constants/districts"
import { validateSignupFields, SIGNUP_FIELD_ORDER, type SignupFieldErrors } from "@/lib/validation/authForm"
import { scrollToFirstFieldError } from "@/lib/validation/scrollToFieldError"
import type { DictKey } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "form" | "qr" | "success"

// ─── Component ───────────────────────────────────────────────────────────────

export function SignupForm() {
  const { t, tEn } = useLang()
  const router = useRouter()

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("form")
  const [pending, setPending] = useState(false)

  // ── Form fields ───────────────────────────────────────────────────────────
  const [registerData, setRegisterData] = useState({
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
    gender: "Groom",
    gotraSelf: "",
    gotraMother: "",
    dob: "",
    district: "",
    education: "",
    profession: "",
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<SignupFieldErrors>({})
  const photoRef = useRef<HTMLInputElement | null>(null)

  // ── Plan / QR state ───────────────────────────────────────────────────────
  const [regPlan, setRegPlan] = useState<{
    required: boolean
    amountInr?: number
    durationDays?: number
    planName?: string
  }>({ required: false })
  const [planReady, setPlanReady] = useState(false)

  // ── QR step state ─────────────────────────────────────────────────────────
  const [orderRef, setOrderRef] = useState<string | null>(null)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [screenshotError, setScreenshotError] = useState<string | null>(null)
  const screenshotRef = useRef<HTMLInputElement | null>(null)

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    getRegistrationPlanAction()
      .then((res) => {
        if (res.success && res.required && res.plan) {
          setRegPlan({
            required: true,
            amountInr: res.plan.amountInr,
            durationDays: res.plan.durationDays,
            planName: res.plan.name,
          })
        } else {
          setRegPlan({ required: false })
        }
      })
      .finally(() => setPlanReady(true))
  }, [])

  const maxDob = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().slice(0, 10)
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function errMsg(key?: string) {
    return key ? t(key as DictKey) : undefined
  }

  function clearError(field: keyof SignupFieldErrors) {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function invalidInput(hasError: boolean) {
    return hasError ? "border-destructive focus:border-destructive focus:ring-red-100" : ""
  }

  // ── Profile photo ─────────────────────────────────────────────────────────
  function openPhotoPicker() {
    const input = photoRef.current
    if (!input) return
    input.value = ""
    input.click()
  }

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error(t("bio.uploadFailed")); return }
    if (file.size > 10 * 1024 * 1024) { toast.error(t("bio.uploadFailed")); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    clearError("photo")
  }

  function clearPhoto() {
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (photoRef.current) photoRef.current.value = ""
    clearError("photo")
  }

  // ── Screenshot ────────────────────────────────────────────────────────────
  function openScreenshotPicker() {
    const input = screenshotRef.current
    if (!input) return
    input.value = ""
    input.click()
  }

  function pickScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error(t("errors.uploadInvalidType"))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("errors.uploadTooLarge"))
      return
    }
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
    setScreenshotError(null)
  }

  function clearScreenshot() {
    setScreenshotFile(null)
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    setScreenshotPreview(null)
    if (screenshotRef.current) screenshotRef.current.value = ""
  }

  // ── Post-registration: login + photo upload + show success ───────────────
  async function finishRegistration(phoneDigits: string, password: string) {
    let loggedIn = false
    try {
      const loginRes = await loginAction(phoneDigits, password)
      loggedIn = loginRes.success

      if (loggedIn && photoFile) {
        const data = new FormData()
        data.append("file", photoFile)
        try {
          const uploadRes = await fetch("/api/profile/upload", { method: "POST", body: data })
          const uploadJson = await uploadRes.json()
          if (!uploadRes.ok || !uploadJson.success) {
            toast.error(resolveActionError(uploadJson.error, t) || t("bio.uploadFailed"))
          }
        } catch {
          // Photo upload failure is non-blocking — user can add photo from dashboard
        }
      }
    } catch {
      // Login failure is non-blocking — user can login manually from success screen
    }

    clearPhoto()
    // Always transition to success regardless of login outcome
    setPending(false)
    setStep("success")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── Step 1: Form submit ───────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    const district = normalizeDistrictInput(registerData.district)
    const validation = validateSignupFields({ ...registerData, district, hasPhoto: !!photoFile })

    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      scrollToFirstFieldError(validation, SIGNUP_FIELD_ORDER)
      return
    }

    if (!planReady) { toast.error(t("auth.planLoading")); return }

    setErrors({})
    setPending(true)

    const profileType = registerData.gender === "Bride" ? "BRIDE" : "GROOM"
    const phoneDigits = registerData.phone
    const payload = {
      ...registerData,
      district,
      phone: phoneDigits,
      profileType: profileType as "GROOM" | "BRIDE",
    }

    // ── Free registration path ──────────────────────────────────────────────
    if (!regPlan.required) {
      const res = await registerAction(payload)
      setPending(false)
      if (!res.success) {
        toast.error(resolveActionError(res.error, t))
        return
      }
      await finishRegistration(phoneDigits, registerData.password)
      return
    }
    // ── Paid path: create local order, then show QR step ───────────────────
    const orderRes = await createRegistrationOrderAction(payload)
    setPending(false)

    if (!orderRes.success) {
      toast.error(resolveActionError(orderRes.error, t))
      return
    }

    setOrderRef(orderRes.orderRef)
    setStep("qr")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── Step 2: Screenshot upload + complete registration ─────────────────────
  async function handleScreenshotSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!screenshotFile) {
      setScreenshotError(t("auth.err.screenshotRequired"))
      return
    }

    if (!orderRef) {
      toast.error(t("errors.generic"))
      return
    }

    setPending(true)

    // 1. Upload the screenshot
    try {
      const fd = new FormData()
      fd.append("file", screenshotFile)
      fd.append("orderRef", orderRef)

      const uploadRes = await fetch("/api/payment/screenshot", { method: "POST", body: fd })
      const uploadJson = await uploadRes.json()

      if (!uploadRes.ok || !uploadJson.success) {
        setPending(false)
        toast.error(uploadJson.error || t("bio.uploadFailed"))
        return
      }
    } catch {
      setPending(false)
      toast.error(t("bio.uploadFailed"))
      return
    }

    // 2. Complete registration (creates user account)
    const completeRes = await completeRegistrationAction(orderRef)
    if (!completeRes.success) {
      // Special case: phone already registered means a previous attempt succeeded.
      // Log them in and show the success screen rather than showing an error.
      const alreadyRegistered =
        completeRes.error?.toLowerCase().includes("already registered") ||
        completeRes.error?.toLowerCase().includes("duplicate") ||
        completeRes.error?.toLowerCase().includes("unique")

      if (alreadyRegistered) {
        await finishRegistration(registerData.phone, registerData.password)
        return
      }

      setPending(false)
      toast.error(completeRes.error || t("errors.generic"), { duration: 6000 })
      return
    }

    // 3. Show success — login happens inside finishRegistration
    await finishRegistration(registerData.phone, registerData.password)
  }

  // ─── Success Step UI ────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <AuthPageShell
        wide
        title={t("auth.success.title")}
        description={t("auth.success.subtitle")}
        alternate={{ href: "/login", label: t("auth.switchToLogin") }}
      >
        <div className="grid w-full gap-5">

          {/* Big success icon */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-green-200 bg-green-50 px-6 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <PartyPopper className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="font-heading text-xl font-bold text-green-800">
              {t("auth.success.title")}
            </h2>
            <p className="text-sm text-green-700">
              {t("auth.success.body")}
            </p>
          </div>

          {/* Steps checklist */}
          <div className="space-y-3 rounded-xl border border-gold-light bg-cream-dark px-5 py-4">
            <Step done label={t("auth.success.step1")} />
            <Step done label={t("auth.success.step2")} />
            <Step pending label={t("auth.success.step3")} />
          </div>

          {/* CTA */}
          <Button
            className="w-full"
            onClick={() => { router.push("/dashboard"); router.refresh() }}
          >
            {t("auth.success.cta")}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t("auth.success.loginFirst")}
          </p>
        </div>
      </AuthPageShell>
    )
  }

  // ─── QR Step UI ────────────────────────────────────────────────────────────
  if (step === "qr") {
    const amount = regPlan.amountInr ?? 501

    return (
      <AuthPageShell
        wide
        title={t("auth.qrTitle", { amount: String(amount) })}
        description={t("auth.qrDesc", { amount: String(amount) })}
        alternate={{ href: "/login", label: t("auth.switchToLogin") }}
      >
        <form onSubmit={handleScreenshotSubmit} noValidate className="grid w-full gap-5">

          {/* Back button */}
          <button
            type="button"
            onClick={() => { setStep("form"); clearScreenshot() }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-maroon w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> {t("auth.backToForm")}
          </button>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gold bg-cream-dark p-5">
            <p className="text-center font-heading text-lg font-bold text-maroon">
              {t("auth.qrTitle", { amount: String(amount) })}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/QR-for_payment.jpeg"
              alt="UPI Payment QR Code"
              className="h-56 w-56 rounded-xl border-2 border-gold object-contain sm:h-64 sm:w-64"
            />
            <p className="text-center text-sm font-semibold text-amber-800">
              ₹{amount} — {regPlan.planName}
            </p>
          </div>

          {/* Screenshot upload */}
          <div className="space-y-2">
            <Label>
              {t("auth.screenshotLabel")} <span className="text-saffron" aria-hidden="true">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">{t("auth.screenshotHint")}</p>

            <input
              ref={screenshotRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={pickScreenshot}
            />

            {screenshotPreview ? (
              <div
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl border-2 bg-cream-dark p-4 sm:flex-row sm:items-center",
                  screenshotError ? "border-destructive" : "border-gold-light"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotPreview}
                  alt="payment screenshot preview"
                  className="h-24 w-24 shrink-0 rounded-xl border border-gold object-cover"
                />
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={openScreenshotPicker}>
                    <Camera className="mr-1 h-4 w-4" /> {t("auth.screenshotChange")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={clearScreenshot}>
                    <X className="mr-1 h-4 w-4" /> {t("auth.photoRemove")}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openScreenshotPicker}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-cream-dark p-5 transition hover:bg-cream",
                  screenshotError ? "border-destructive" : "border-gold"
                )}
              >
                <ImageIcon className="h-5 w-5 shrink-0 text-gold" />
                <span className="font-semibold text-muted-foreground">{t("auth.screenshotPick")}</span>
              </button>
            )}
            {screenshotError && (
              <p className="text-sm font-medium text-destructive">{screenshotError}</p>
            )}
          </div>

          {/* Info note */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <CheckCircle2 className="mb-1 inline h-4 w-4 text-blue-600" />{" "}
            {t("auth.paymentNote")}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={pending}
          >
            {pending ? t("auth.completing") : t("auth.submitScreenshot")}
          </Button>
        </form>
      </AuthPageShell>
    )
  }

  // ─── Step 1: Registration Form ─────────────────────────────────────────────
  return (
    <AuthPageShell
      wide
      title={t("auth.tabRegister")}
      description={t("auth.desc")}
      alternate={{ href: "/login", label: t("auth.switchToLogin") }}
    >
      <form onSubmit={handleRegister} noValidate className="grid w-full min-w-0 gap-4">

        {/* Profile photo */}
        <div className="min-w-0 space-y-2" data-form-field="photo">
          <Label>
            {t("auth.photo")} <span className="text-saffron" aria-hidden="true">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">{t("auth.photoHint")}</p>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          {photoPreview ? (
            <div className={cn(
              "flex flex-col items-center gap-3 rounded-2xl border-2 bg-cream-dark p-4 sm:flex-row sm:items-center",
              errors.photo ? "border-destructive" : "border-gold-light"
            )}>
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-gold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={openPhotoPicker}>
                  <Camera className="mr-1 h-4 w-4" /> {t("auth.photoChange")}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={clearPhoto}>
                  <X className="mr-1 h-4 w-4" /> {t("auth.photoRemove")}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openPhotoPicker}
              className={cn(
                "flex w-full min-w-0 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-cream-dark p-4 transition hover:bg-cream",
                errors.photo ? "border-destructive" : "border-gold"
              )}
            >
              <Upload className="h-5 w-5 shrink-0 text-gold" />
              <span className="font-semibold text-muted-foreground">{t("auth.photoPick")}</span>
            </button>
          )}
          <FieldError message={errMsg(errors.photo)} />
        </div>

        {/* Name + Gender */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2" data-form-field="username">
            <Label htmlFor="reg-name">{t("auth.fullName")}</Label>
            <Input
              id="reg-name"
              value={registerData.username}
              onChange={(e) => { setRegisterData({ ...registerData, username: e.target.value }); clearError("username") }}
              placeholder={tEn("auth.fullNamePh")}
              className={invalidInput(!!errors.username)}
              aria-invalid={!!errors.username}
            />
            <FieldError message={errMsg(errors.username)} />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-gender">{t("auth.gender")}</Label>
            <Select value={registerData.gender} onValueChange={(gender) => setRegisterData({ ...registerData, gender })}>
              <SelectTrigger id="reg-gender"><SelectValue placeholder={tEn("auth.genderPh")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Groom">{t("auth.groom")}</SelectItem>
                <SelectItem value="Bride">{t("auth.bride")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gotra */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2" data-form-field="gotraSelf">
            <Label htmlFor="reg-gotra-self">{t("auth.gotraSelf")}</Label>
            <Input
              id="reg-gotra-self"
              value={registerData.gotraSelf}
              onChange={(e) => { setRegisterData({ ...registerData, gotraSelf: e.target.value }); clearError("gotraSelf") }}
              placeholder={tEn("auth.gotraSelfPh")}
              className={invalidInput(!!errors.gotraSelf)}
              aria-invalid={!!errors.gotraSelf}
            />
            <FieldError message={errMsg(errors.gotraSelf)} />
          </div>
          <div className="min-w-0 space-y-2" data-form-field="gotraMother">
            <Label htmlFor="reg-gotra-mother">{t("auth.gotraMother")}</Label>
            <Input
              id="reg-gotra-mother"
              value={registerData.gotraMother}
              onChange={(e) => { setRegisterData({ ...registerData, gotraMother: e.target.value }); clearError("gotraMother") }}
              placeholder={tEn("auth.gotraMotherPh")}
              className={invalidInput(!!errors.gotraMother)}
              aria-invalid={!!errors.gotraMother}
            />
            <FieldError message={errMsg(errors.gotraMother)} />
          </div>
        </div>

        {/* DOB + District */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2" data-form-field="dob">
            <Label htmlFor="reg-dob">{t("auth.dob")}</Label>
            <Input
              id="reg-dob"
              type="date"
              max={maxDob}
              value={registerData.dob}
              onChange={(e) => { setRegisterData({ ...registerData, dob: e.target.value }); clearError("dob") }}
              className={invalidInput(!!errors.dob)}
              aria-invalid={!!errors.dob}
            />
            <FieldError message={errMsg(errors.dob)} />
          </div>
          <div className="min-w-0 space-y-2" data-form-field="district">
            <Label htmlFor="reg-district">{t("auth.district")}</Label>
            <DistrictField
              id="reg-district"
              value={registerData.district}
              onChange={(district) => { setRegisterData({ ...registerData, district }); clearError("district") }}
              invalid={!!errors.district}
            />
            <FieldError message={errMsg(errors.district)} />
          </div>
        </div>

        {/* Education + Profession */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2" data-form-field="education">
            <Label htmlFor="reg-education">{t("auth.education")}</Label>
            <Input
              id="reg-education"
              value={registerData.education}
              onChange={(e) => { setRegisterData({ ...registerData, education: e.target.value }); clearError("education") }}
              placeholder={tEn("auth.educationPh")}
              className={invalidInput(!!errors.education)}
              aria-invalid={!!errors.education}
            />
            <FieldError message={errMsg(errors.education)} />
          </div>
          <div className="min-w-0 space-y-2" data-form-field="profession">
            <Label htmlFor="reg-profession">{t("auth.profession")}</Label>
            <Input
              id="reg-profession"
              value={registerData.profession}
              onChange={(e) => { setRegisterData({ ...registerData, profession: e.target.value }); clearError("profession") }}
              placeholder={tEn("auth.professionPh")}
              className={invalidInput(!!errors.profession)}
              aria-invalid={!!errors.profession}
            />
            <FieldError message={errMsg(errors.profession)} />
          </div>
        </div>

        {/* Phone */}
        <div className="min-w-0 space-y-2" data-form-field="phone">
          <Label htmlFor="reg-phone">{t("auth.mobile")}</Label>
          <PhoneInput
            id="reg-phone"
            value={registerData.phone}
            onChange={(digits) => { setRegisterData({ ...registerData, phone: digits }); clearError("phone") }}
            placeholder={tEn("auth.mobilePh")}
            invalid={!!errors.phone}
          />
          <FieldError message={errMsg(errors.phone)} />
        </div>

        {/* Password */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2" data-form-field="password">
            <Label htmlFor="reg-password">{t("auth.setPassword")}</Label>
            <PasswordInput
              id="reg-password"
              value={registerData.password}
              onChange={(e) => {
                setRegisterData({ ...registerData, password: e.target.value })
                clearError("password")
                if (errors.confirmPassword) clearError("confirmPassword")
              }}
              placeholder={tEn("auth.passwordSetPh")}
              autoComplete="new-password"
              className={invalidInput(!!errors.password)}
              aria-invalid={!!errors.password}
            />
            <FieldError message={errMsg(errors.password)} />
          </div>
          <div className="min-w-0 space-y-2" data-form-field="confirmPassword">
            <Label htmlFor="reg-confirm-password">{t("auth.confirmPassword")}</Label>
            <PasswordInput
              id="reg-confirm-password"
              value={registerData.confirmPassword}
              onChange={(e) => { setRegisterData({ ...registerData, confirmPassword: e.target.value }); clearError("confirmPassword") }}
              placeholder={tEn("auth.confirmPasswordPh")}
              autoComplete="new-password"
              className={invalidInput(!!errors.confirmPassword)}
              aria-invalid={!!errors.confirmPassword}
            />
            <FieldError message={errMsg(errors.confirmPassword)} />
          </div>
        </div>

        {/* Payment notice */}
        {regPlan.required && regPlan.amountInr != null && (
          <div className="rounded-xl border border-saffron/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>{t("auth.payToRegister", {
              amount: String(regPlan.amountInr),
              duration: String(regPlan.durationDays ?? 365),
            })}</p>
            {regPlan.planName && (
              <p className="mt-1 font-semibold">{regPlan.planName}</p>
            )}
            <p className="mt-1 text-xs text-amber-700">
              {t("auth.paymentNote")}
            </p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending || !planReady}>
          {!planReady
            ? t("auth.planLoading")
            : pending
              ? t("auth.creating")
              : regPlan.required
                ? t("auth.payAndRegister", { amount: String(regPlan.amountInr ?? 501) })
                : t("auth.register")}
        </Button>
      </form>
    </AuthPageShell>
  )
}

// ─── Step indicator helper ────────────────────────────────────────────────────
function Step({ done, pending, label }: { done?: boolean; pending?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
      ) : (
        <Clock className="h-5 w-5 shrink-0 text-amber-500" />
      )}
      <span className={`text-sm font-medium ${done ? "text-green-800" : "text-amber-700"}`}>
        {label}
      </span>
    </div>
  )
}
