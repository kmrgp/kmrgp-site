"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Camera, Upload, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction, registerAction } from "@/lib/actions/auth"
import {
  getRegistrationPlanAction,
  createRegistrationOrderAction,
  verifyRegistrationPaymentAction,
} from "@/lib/actions/payment"
import { useLang } from "@/lib/i18n/LanguageProvider"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: "login" | "register"
}

export function AuthModal({ open, onOpenChange, defaultTab = "login" }: AuthModalProps) {
  const { t } = useLang()
  const router = useRouter()
  const [tab, setTab] = useState(defaultTab)
  const [pending, setPending] = useState(false)

  const [loginPhone, setLoginPhone] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [registerData, setRegisterData] = useState({
    username: "",
    phone: "",
    password: "",
    gender: "Groom",
    gotraSelf: "",
    gotraMother: "",
    dob: "",
    district: "Bhopal",
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
    if (!open) return
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
  }, [open, tab])

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await loginAction(loginPhone, loginPassword)
    setPending(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(t("auth.loginSuccess"))
    onOpenChange(false)
    router.push("/dashboard")
    router.refresh()
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
    setTab("login")
    setLoginPhone(phone)
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
    setPending(true)

    const profileType = registerData.gender === "Bride" ? "BRIDE" : "GROOM"
    const payload = {
      ...registerData,
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
        onOpenChange(false)
      },
      modal: {
        ondismiss: () => toast.info(t("auth.paymentCancelled")),
      },
    })
    rzp.open()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) clearPhoto() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("auth.title")}</DialogTitle>
          <DialogDescription>{t("auth.desc")}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("auth.tabLogin")}</TabsTrigger>
            <TabsTrigger value="register">{t("auth.tabRegister")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-phone">{t("auth.mobile")}</Label>
                <Input id="login-phone" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} placeholder={t("auth.mobilePh")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">{t("auth.password")}</Label>
                <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder={t("auth.passwordPh")} />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>{pending ? t("auth.verifying") : t("auth.accessDashboard")}</Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="grid gap-3">
              {/* Photo picker */}
              <div className="mb-1 space-y-2">
                <Label>{t("auth.photo")}</Label>
                <p className="text-xs text-muted-foreground">{t("auth.photoHint")}</p>
                {photoPreview ? (
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-gold">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Camera className="mr-1 h-4 w-4" /> {t("auth.photoChange")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={clearPhoto}>
                      <X className="mr-1 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold bg-cream-dark p-4 transition hover:bg-cream">
                    <Upload className="h-5 w-5 text-gold" />
                    <span className="font-semibold text-muted-foreground">{t("auth.photoPick")}</span>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">{t("auth.fullName")}</Label>
                  <Input id="reg-name" value={registerData.username} onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-gender">{t("auth.gender")}</Label>
                  <select
                    id="reg-gender"
                    className="flex min-h-[52px] w-full rounded-2xl border-2 border-gold-hover bg-white px-4 text-base"
                    value={registerData.gender}
                    onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                  >
                    <option value="Groom">{t("auth.groom")}</option>
                    <option value="Bride">{t("auth.bride")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-gotra-self">{t("auth.gotraSelf")}</Label>
                  <Input id="reg-gotra-self" value={registerData.gotraSelf} onChange={(e) => setRegisterData({ ...registerData, gotraSelf: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-gotra-mother">{t("auth.gotraMother")}</Label>
                  <Input id="reg-gotra-mother" value={registerData.gotraMother} onChange={(e) => setRegisterData({ ...registerData, gotraMother: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-dob">{t("auth.dob")}</Label>
                  <Input id="reg-dob" type="date" value={registerData.dob} onChange={(e) => setRegisterData({ ...registerData, dob: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-district">{t("auth.district")}</Label>
                  <select
                    id="reg-district"
                    className="flex min-h-[52px] w-full rounded-2xl border-2 border-gold-hover bg-white px-4 text-base"
                    value={registerData.district}
                    onChange={(e) => setRegisterData({ ...registerData, district: e.target.value })}
                  >
                    <option>Bhopal</option>
                    <option>Sehore</option>
                    <option>Rajgarh</option>
                    <option>Indore</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-education">{t("auth.education")}</Label>
                  <Input id="reg-education" value={registerData.education} onChange={(e) => setRegisterData({ ...registerData, education: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-profession">{t("auth.profession")}</Label>
                  <Input id="reg-profession" value={registerData.profession} onChange={(e) => setRegisterData({ ...registerData, profession: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">{t("auth.mobile")}</Label>
                  <Input id="reg-phone" value={registerData.phone} onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">{t("auth.setPassword")}</Label>
                  <Input id="reg-password" type="password" value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} />
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}