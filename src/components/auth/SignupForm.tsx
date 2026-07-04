"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Camera, Upload, X } from "lucide-react"
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
  verifyRegistrationPaymentAction,
} from "@/lib/actions/payment"
import { loginAction } from "@/lib/actions/auth"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { AuthPageShell } from "@/components/auth/AuthPageShell"
import { DistrictField } from "@/components/ui/DistrictField"
import { normalizeDistrictInput } from "@/lib/constants/districts"

export function SignupForm() {
  const { t } = useLang()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const [registerData, setRegisterData] = useState({
    username: "",
    phone: "",
    password: "",
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
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [regPlan, setRegPlan] = useState<{
    required: boolean
    amountInr?: number
    durationDays?: number
    planName?: string
  }>({ required: false })

  useEffect(() => {
    getRegistrationPlanAction().then((res) => {
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
  }, [])

  function openPhotoPicker() {
    const input = fileRef.current
    if (!input) return
    input.value = ""
    input.click()
  }

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error(t("bio.uploadFailed"))
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error(t("bio.uploadFailed"))
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function finishRegistration(phone: string, password: string) {
    if (photoFile) {
      const loginRes = await loginAction(phone, password)
      if (loginRes.success) {
        const data = new FormData()
        data.append("file", photoFile)
        try {
          await fetch("/api/profile/upload", { method: "POST", body: data })
        } catch {
          // best-effort
        }
      }
      clearPhoto()
    }

    toast.success(t("auth.regSuccess"))
    router.push("/login?registered=1")
    router.refresh()
  }

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve()
        return
      }
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Could not load payment gateway"))
      document.body.appendChild(script)
    })
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    if (!photoFile) {
      toast.error(t("auth.photoRequired"))
      return
    }

    const district = normalizeDistrictInput(registerData.district)
    if (!district) {
      toast.error(t("auth.districtRequired"))
      return
    }

    setPending(true)

    const profileType = registerData.gender === "Bride" ? "BRIDE" : "GROOM"
    const payload = {
      ...registerData,
      district,
      phone: registerData.phone.replace(/\D/g, ""),
      profileType: profileType as "GROOM" | "BRIDE",
    }

    if (!regPlan.required) {
      const res = await registerAction(payload)
      setPending(false)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      await finishRegistration(registerData.phone, registerData.password)
      return
    }

    const orderRes = await createRegistrationOrderAction(payload)
    if (!orderRes.success) {
      setPending(false)
      toast.error(orderRes.error)
      return
    }

    try {
      await loadRazorpayScript()
    } catch {
      setPending(false)
      toast.error(t("auth.paymentFailed"))
      return
    }

    setPending(false)

    const Razorpay = window.Razorpay
    if (!Razorpay) {
      toast.error(t("auth.paymentFailed"))
      return
    }

    const rzp = new Razorpay({
      key: orderRes.keyId,
      amount: orderRes.amountPaise,
      currency: "INR",
      name: "Kshatriya Mewada Rajput Parivar",
      description: orderRes.planName,
      order_id: orderRes.orderId,
      prefill: { name: registerData.username, contact: registerData.phone },
      theme: { color: "#800020" },
      handler: async (response) => {
        setPending(true)
        const verifyRes = await verifyRegistrationPaymentAction(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        )
        setPending(false)
        if (!verifyRes.success) {
          toast.error(verifyRes.error ?? t("auth.paymentFailed"))
          return
        }
        await finishRegistration(registerData.phone, registerData.password)
      },
      modal: {
        ondismiss: () => toast.info(t("auth.paymentCancelled")),
      },
    })
    rzp.open()
  }

  return (
    <AuthPageShell
      wide
      title={t("auth.tabRegister")}
      description={t("auth.desc")}
      alternate={{ href: "/login", label: t("auth.switchToLogin") }}
    >
      <form onSubmit={handleRegister} className="grid w-full min-w-0 gap-4">
        <div className="min-w-0 space-y-2">
          <Label>
            {t("auth.photo")} <span className="text-saffron" aria-hidden="true">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">{t("auth.photoHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            required
            className="hidden"
            onChange={pickPhoto}
          />
          {photoPreview ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gold-light bg-cream-dark p-4 sm:flex-row sm:items-center">
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
              className="flex w-full min-w-0 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold bg-cream-dark p-4 transition hover:bg-cream"
            >
              <Upload className="h-5 w-5 shrink-0 text-gold" />
              <span className="font-semibold text-muted-foreground">{t("auth.photoPick")}</span>
            </button>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-name">{t("auth.fullName")}</Label>
            <Input
              id="reg-name"
              value={registerData.username}
              onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-gender">{t("auth.gender")}</Label>
            <Select
              value={registerData.gender}
              onValueChange={(gender) => setRegisterData({ ...registerData, gender })}
            >
              <SelectTrigger id="reg-gender">
                <SelectValue placeholder={t("auth.gender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Groom">{t("auth.groom")}</SelectItem>
                <SelectItem value="Bride">{t("auth.bride")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-gotra-self">{t("auth.gotraSelf")}</Label>
            <Input
              id="reg-gotra-self"
              value={registerData.gotraSelf}
              onChange={(e) => setRegisterData({ ...registerData, gotraSelf: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-gotra-mother">{t("auth.gotraMother")}</Label>
            <Input
              id="reg-gotra-mother"
              value={registerData.gotraMother}
              onChange={(e) => setRegisterData({ ...registerData, gotraMother: e.target.value })}
            />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-dob">{t("auth.dob")}</Label>
            <Input
              id="reg-dob"
              type="date"
              value={registerData.dob}
              onChange={(e) => setRegisterData({ ...registerData, dob: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-district">{t("auth.district")}</Label>
            <DistrictField
              id="reg-district"
              value={registerData.district}
              onChange={(district) => setRegisterData({ ...registerData, district })}
            />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-education">{t("auth.education")}</Label>
            <Input
              id="reg-education"
              value={registerData.education}
              onChange={(e) => setRegisterData({ ...registerData, education: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-profession">{t("auth.profession")}</Label>
            <Input
              id="reg-profession"
              value={registerData.profession}
              onChange={(e) => setRegisterData({ ...registerData, profession: e.target.value })}
            />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-phone">{t("auth.mobile")}</Label>
            <Input
              id="reg-phone"
              value={registerData.phone}
              onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
              autoComplete="tel"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="reg-password">{t("auth.setPassword")}</Label>
            <Input
              id="reg-password"
              type="password"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              autoComplete="new-password"
            />
          </div>
        </div>

        {regPlan.required && regPlan.amountInr != null && (
          <div className="rounded-xl border border-saffron/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("auth.payToRegister", {
              amount: `₹${regPlan.amountInr}`,
              duration: String(regPlan.durationDays ?? 365),
            })}
            {regPlan.planName && (
              <span className="mt-1 block font-semibold">{regPlan.planName}</span>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? t("auth.creating")
            : regPlan.required
              ? t("auth.payAndRegister")
              : t("auth.register")}
        </Button>
      </form>
    </AuthPageShell>
  )
}
