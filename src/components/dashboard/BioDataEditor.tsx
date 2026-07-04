"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Save,
  Printer,
  Camera,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Info,
  UploadCloud,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SafeImage } from "@/components/ui/safe-image"
import { PhoneInput } from "@/components/ui/PhoneInput"
import { DistrictField } from "@/components/ui/DistrictField"
import { FieldError } from "@/components/ui/FieldError"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { resolveActionError } from "@/lib/i18n/actionErrors"
import {
  ageFromDob,
  validateProfileForm,
  validateProfileSection,
  PROFILE_FIELD_ORDER,
  type ProfileFormErrors,
} from "@/lib/validation/profileForm"
import { scrollToFirstFieldError } from "@/lib/validation/scrollToFieldError"
import type { DictKey } from "@/lib/i18n/dictionary"
import type { PublicProfile, Role } from "@/types"
import { cn } from "@/lib/utils"

interface BioDataEditorProps {
  profile: PublicProfile
  role: Role
  onProfileUpdate?: (profile: Partial<PublicProfile>) => void
}

type FormState = {
  username: string
  type: PublicProfile["type"]
  gender: string
  dob: string
  height: string
  district: string
  gotraSelf: string
  gotraMother: string
  education: string
  currentEducation: string
  profession: string
  companyName: string
  fatherName: string
  fatherOccupation: string
  motherName: string
  motherOccupation: string
  brothers: string
  sisters: string
  familyType: string
  address: string
  contact: string
  guardianMobile: string
  whatsappNumber: string
  hobbies: string
  additionalDetails: string
  visible: boolean
}

type SectionId = "candidate" | "education" | "extras"

const SECTION_FIELDS: Record<SectionId, (keyof Omit<FormState, "visible">)[]> = {
  candidate: [
    "username",
    "type",
    "gender",
    "dob",
    "height",
    "district",
    "gotraSelf",
    "gotraMother",
    "address",
  ],
  education: [
    "education",
    "currentEducation",
    "profession",
    "companyName",
    "fatherName",
    "fatherOccupation",
    "motherName",
    "motherOccupation",
    "brothers",
    "sisters",
    "familyType",
    "contact",
    "guardianMobile",
    "whatsappNumber",
  ],
  extras: ["hobbies", "additionalDetails"],
}

function pickSectionData(form: FormState, section: SectionId) {
  return Object.fromEntries(SECTION_FIELDS[section].map((key) => [key, form[key]]))
}

function isSectionDirty(section: SectionId, form: FormState, baseline: FormState) {
  return SECTION_FIELDS[section].some((key) => form[key] !== baseline[key])
}

async function patchProfileApi(data: Record<string, unknown>): Promise<PublicProfile | null> {
  const res = await fetch("/api/profile/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Save failed")
  }
  return json.profile ?? null
}

function defaultGender(type: PublicProfile["type"]) {
  return type === "GROOM" ? "Male" : "Female"
}

function formFromProfile(profile: PublicProfile): FormState {
  return {
    username: profile.username || "",
    type: profile.type,
    gender: profile.gender || defaultGender(profile.type),
    dob: profile.dob || "",
    height: profile.height && profile.height !== "-" ? profile.height : "",
    district: profile.district || "",
    gotraSelf: profile.gotraSelf || "",
    gotraMother: profile.gotraMother || "",
    education: profile.education || "",
    currentEducation: profile.currentEducation || "",
    profession: profile.profession || "",
    companyName: profile.companyName || "",
    fatherName: profile.fatherName || "",
    fatherOccupation: profile.fatherOccupation || "",
    motherName: profile.motherName || "",
    motherOccupation: profile.motherOccupation || "",
    brothers: profile.brothers || "",
    sisters: profile.sisters || "",
    familyType: profile.familyType || "",
    address: profile.address || "",
    contact: profile.contact || profile.phone || "",
    guardianMobile: profile.guardianMobile || "",
    whatsappNumber: profile.whatsappNumber || "",
    hobbies: profile.hobbies || "",
    additionalDetails: profile.additionalDetails || "",
    visible: profile.visible,
  }
}


const MAX_UPLOAD = 10 * 1024 * 1024

export function BioDataEditor({ profile, role, onProfileUpdate }: BioDataEditorProps) {
  const { t } = useLang()
  const router = useRouter()
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit")
  const [baseline, setBaseline] = useState<FormState>(() => formFromProfile(profile))
  const [form, setForm] = useState<FormState>(() => formFromProfile(profile))
  const [dragging, setDragging] = useState(false)
  const [castDragging, setCastDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingSection, setSavingSection] = useState<SectionId | null>(null)
  const [savedFlash, setSavedFlash] = useState<SectionId | null>(null)
  const [errors, setErrors] = useState<ProfileFormErrors>({})
  const [declarationAccepted, setDeclarationAccepted] = useState(false)
  const [hasPhoto, setHasPhoto] = useState(!!profile.imageUrl)
  const [castUrl, setCastUrl] = useState(profile.castCertificateUrl)
  const photoRef = useRef<HTMLInputElement | null>(null)
  const castRef = useRef<HTMLInputElement | null>(null)

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
  const locked = !isAdmin && profile.approvalStatus === "APPROVED"
  const canToggleVisibility = isAdmin || profile.approvalStatus === "APPROVED"
  const computedAge = useMemo(() => ageFromDob(form.dob), [form.dob])

  const sectionDirty = useMemo(
    () => ({
      candidate: isSectionDirty("candidate", form, baseline),
      education: isSectionDirty("education", form, baseline),
      extras: isSectionDirty("extras", form, baseline),
    }),
    [form, baseline]
  )

  useEffect(() => {
    if (!savedFlash) return
    const timer = setTimeout(() => setSavedFlash(null), 2500)
    return () => clearTimeout(timer)
  }, [savedFlash])

  useEffect(() => {
    setHasPhoto(!!profile.imageUrl)
    setCastUrl(profile.castCertificateUrl)
  }, [profile.imageUrl, profile.castCertificateUrl])

  useEffect(() => {
    const next = formFromProfile(profile)
    setForm(next)
    setBaseline(next)
    // Reset editor when approval workflow changes (e.g. admin reject/approve).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid clobbering edits on every profile field refresh
  }, [profile.approvalStatus, profile.userId])

  function errMsg(key?: string) {
    return key ? t(key as DictKey) : undefined
  }

  function clearError(field: keyof ProfileFormErrors) {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function formatDob(dob: string) {
    if (!dob || dob === "-") return "-"
    const d = new Date(dob)
    if (isNaN(d.getTime())) return dob
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  }

  async function uploadFile(file: File, kind: "photo" | "cast") {
    const isPhoto = kind === "photo"
    if (isPhoto && !file.type.startsWith("image/")) {
      toast.error(t("bio.uploadFailed"))
      return
    }
    if (!isPhoto && !file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error(t("bio.uploadFailed"))
      return
    }
    if (file.size > MAX_UPLOAD) {
      toast.error(t("bio.uploadFailed"))
      return
    }
    const data = new FormData()
    data.append("file", file)
    data.append("kind", kind)
    const res = await fetch("/api/profile/upload", { method: "POST", body: data })
    const json = await res.json()
    if (!json.success) {
      toast.error(resolveActionError(json.error, t))
      return
    }
    if (kind === "cast") {
      setCastUrl(json.fileUrl)
      onProfileUpdate?.({ castCertificateUrl: json.fileUrl })
      toast.success(t("bio.castUploaded"))
    } else {
      setHasPhoto(true)
      onProfileUpdate?.({ imageUrl: json.imageUrl ?? json.fileUrl })
      toast.success(t("bio.photoUploaded"))
    }
    router.refresh()
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file, "photo")
  }

  function handleCastUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file, "cast")
  }

  const onPhotoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (locked) return
      const file = e.dataTransfer.files?.[0]
      if (file) uploadFile(file, "photo")
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locked]
  )

  const onCastDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setCastDragging(false)
      if (locked) return
      const file = e.dataTransfer.files?.[0]
      if (file) uploadFile(file, "cast")
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locked]
  )

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleTypeChange(type: FormState["type"]) {
    patchForm({ type, gender: defaultGender(type) })
    clearError("type")
  }

  async function saveSection(section: SectionId) {
    const sectionErrors = validateProfileSection(section, {
      username: form.username,
      type: form.type,
      dob: form.dob,
      address: form.address,
      gotraSelf: form.gotraSelf,
      gotraMother: form.gotraMother,
      education: form.education,
      profession: form.profession,
      fatherName: form.fatherName,
      fatherOccupation: form.fatherOccupation,
      motherName: form.motherName,
      motherOccupation: form.motherOccupation,
      familyType: form.familyType,
      contact: form.contact,
      guardianMobile: form.guardianMobile,
    })
    if (Object.keys(sectionErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...sectionErrors }))
      scrollToFirstFieldError(sectionErrors, PROFILE_FIELD_ORDER)
      toast.error(t("bio.fixErrors"))
      return
    }

    setSavingSection(section)
    try {
      const updated = await patchProfileApi(pickSectionData(form, section))
      setBaseline((prev) => ({ ...prev, ...pickSectionData(form, section) }))
      if (updated) onProfileUpdate?.(updated)
      setSavedFlash(section)
      toast.success(t("bio.sectionSaved"))
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? resolveActionError(err.message, t) : t("bio.uploadFailed"))
    } finally {
      setSavingSection(null)
    }
  }

  async function persistProfile(forSubmit: boolean) {
    const validation = validateProfileForm({
      ...form,
      hasPhoto,
      declarationAccepted,
      forSubmit,
    })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      scrollToFirstFieldError(validation, PROFILE_FIELD_ORDER)
      toast.error(t("bio.fixErrors"))
      return false
    }

    setErrors({})
    setSaving(true)
    try {
      const { visible: _visible, ...payload } = form
      const updated = await patchProfileApi(payload)
      setBaseline({ ...form })
      if (updated) onProfileUpdate?.(updated)
      toast.success(t("bio.saved"))
      router.refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? resolveActionError(err.message, t) : t("bio.uploadFailed"))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAll() {
    await persistProfile(false)
  }

  async function handleRequestApproval() {
    const saved = await persistProfile(true)
    if (!saved) return
    try {
      const res = await fetch("/api/profile/submit", { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(resolveActionError(json.error, t))
        return
      }
      toast.success(t("bio.submitted"))
      if (json.profile) onProfileUpdate?.(json.profile)
      else onProfileUpdate?.({ approvalStatus: "PENDING" })
      router.refresh()
    } catch {
      toast.error(t("bio.uploadFailed"))
    }
  }

  async function handleToggleVisibility() {
    try {
      const nextVisible = !form.visible
      const updated = await patchProfileApi({ visible: nextVisible })
      setForm((prev) => {
        const next = { ...prev, visible: nextVisible }
        setBaseline((b) => ({ ...b, visible: nextVisible }))
        return next
      })
      if (updated) onProfileUpdate?.(updated)
      toast.success(nextVisible ? t("bio.shown") : t("bio.hidden"))
    } catch (err) {
      toast.error(err instanceof Error ? resolveActionError(err.message, t) : t("bio.uploadFailed"))
    }
  }

  let statusConfig = {
    icon: Info,
    color: "text-gold",
    bg: "bg-white border-gold-light",
    text: t("bio.draft"),
    showButton: true,
  }

  if (isAdmin) {
    statusConfig = {
      icon: ShieldCheck,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      text: t("bio.adminAccount"),
      showButton: false,
    }
  } else if (profile.approvalStatus === "APPROVED") {
    statusConfig = {
      icon: ShieldCheck,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      text: t("bio.verified"),
      showButton: false,
    }
  } else if (profile.approvalStatus === "PENDING") {
    statusConfig = {
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50 border-yellow-200",
      text: t("bio.pending"),
      showButton: false,
    }
  } else if (profile.approvalStatus === "REJECTED") {
    statusConfig = {
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      text: t("bio.rejected"),
      showButton: true,
    }
  }

  const StatusIcon = statusConfig.icon

  const editPanel = (
    <Card className="no-print min-w-0 overflow-hidden p-4 sm:p-6">
      <h2 className="mb-1 hidden font-heading text-xl font-bold text-maroon sm:text-2xl lg:block">
        {t("bio.completeTitle")}
      </h2>
      <p className="mb-4 hidden text-sm text-muted-foreground lg:block">{t("bio.editTitle")}</p>

      <div className={`mb-5 flex flex-col gap-3 rounded-xl border p-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between ${statusConfig.bg}`}>
        <div className="flex min-w-0 items-center gap-3">
          <StatusIcon className={`h-5 w-5 shrink-0 ${statusConfig.color}`} />
          <span className={`text-sm font-bold sm:text-base ${statusConfig.color}`}>{statusConfig.text}</span>
        </div>
        {statusConfig.showButton && (
          <Button size="sm" className="w-full shrink-0 sm:w-auto" onClick={handleRequestApproval} disabled={saving}>
            {t("bio.submit")}
          </Button>
        )}
      </div>

      <div className={`mb-5 flex flex-col gap-4 rounded-xl border border-gold-light bg-cream-dark p-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between ${!canToggleVisibility ? "opacity-60" : ""}`}>
        <div className="flex min-w-0 items-center gap-3">
          {form.visible ? <Eye className="h-5 w-5 shrink-0 text-green-600" /> : <EyeOff className="h-5 w-5 shrink-0 text-saffron" />}
          <div className="min-w-0">
            <div className="font-bold text-maroon">{form.visible ? t("bio.profileVisible") : t("bio.profileHidden")}</div>
            <div className="text-xs text-muted-foreground">
              {canToggleVisibility
                ? form.visible
                  ? t("bio.profileVisibleDesc")
                  : t("bio.profileHiddenDesc")
                : t("bio.visibilityLocked")}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleVisibility}
          disabled={!canToggleVisibility}
          className={`relative h-6 w-11 shrink-0 self-end rounded-full transition sm:self-center ${form.visible ? "bg-green-600" : "bg-saffron"} ${!canToggleVisibility ? "cursor-not-allowed opacity-50" : ""}`}
          aria-label={form.visible ? t("bio.hideProfile") : t("bio.showProfile")}
          aria-pressed={form.visible}
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${form.visible ? "left-6" : "left-1"}`} />
        </button>
      </div>

      <ProfileSection
        title={t("bio.sectionCandidate")}
        dirty={sectionDirty.candidate}
        saved={savedFlash === "candidate"}
        saving={savingSection === "candidate"}
        onSave={() => saveSection("candidate")}
        saveLabel={t("bio.saveSection")}
        unsavedLabel={t("bio.unsavedChanges")}
        savedLabel={t("bio.sectionSaved")}
        disabled={locked}
      >
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2" data-form-field="type">
          <Label>{t("bio.candidateType")} *</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["GROOM", "BRIDE"] as const).map((value) => (
              <button
                key={value}
                type="button"
                disabled={locked}
                onClick={() => handleTypeChange(value)}
                className={cn(
                  "rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition",
                  form.type === value
                    ? "border-maroon bg-maroon text-white"
                    : "border-gold-light bg-white text-maroon hover:border-gold"
                )}
              >
                {value === "GROOM" ? t("auth.groom") : t("auth.bride")}
              </button>
            ))}
          </div>
          <FieldError message={errMsg(errors.type)} />
        </div>

        <Field label={`${t("bio.fullName")} *`} value={form.username} field="username" error={errors.username} onChange={(v) => { patchForm({ username: v }); clearError("username") }} disabled={locked} />
        <Field label={`${t("bio.dob")} *`} value={form.dob} field="dob" error={errors.dob} onChange={(v) => { patchForm({ dob: v }); clearError("dob") }} disabled={locked} type="date" />
        <Field label={`${t("bio.age")} *`} value={computedAge !== null ? String(computedAge) : ""} disabled readOnly />
        <Field label={t("bio.gender")}>
          <Select value={form.gender} disabled={locked} onValueChange={(v) => patchForm({ gender: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">{t("bio.male")}</SelectItem>
              <SelectItem value="Female">{t("bio.female")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("bio.height")} value={form.height} onChange={(v) => patchForm({ height: v })} disabled={locked} placeholder={t("bio.heightPh")} />
        <div className="sm:col-span-2" data-form-field="address">
          <Field label={`${t("bio.fullAddress")} *`} value={form.address} error={errors.address} onChange={(v) => { patchForm({ address: v }); clearError("address") }} disabled={locked} multiline />
          <FieldError message={errMsg(errors.address)} />
        </div>
        <div data-form-field="gotraSelf">
          <Field label={`${t("bio.gotraCaste")} *`} value={form.gotraSelf} error={errors.gotraSelf} onChange={(v) => { patchForm({ gotraSelf: v }); clearError("gotraSelf") }} disabled={locked} />
          <FieldError message={errMsg(errors.gotraSelf)} />
        </div>
        <div data-form-field="gotraMother">
          <Field label={`${t("bio.maternalGotra")} *`} value={form.gotraMother} error={errors.gotraMother} onChange={(v) => { patchForm({ gotraMother: v }); clearError("gotraMother") }} disabled={locked} />
          <FieldError message={errMsg(errors.gotraMother)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-2">{t("bio.district")}</Label>
          <DistrictField value={form.district} onChange={(v) => patchForm({ district: v })} disabled={locked} />
        </div>
      </div>
      </ProfileSection>

      <ProfileSection
        title={t("bio.sectionEducation")}
        className="mt-8"
        dirty={sectionDirty.education}
        saved={savedFlash === "education"}
        saving={savingSection === "education"}
        onSave={() => saveSection("education")}
        saveLabel={t("bio.saveSection")}
        unsavedLabel={t("bio.unsavedChanges")}
        savedLabel={t("bio.sectionSaved")}
        disabled={locked}
      >
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div data-form-field="education">
          <Field label={`${t("bio.highestQualification")} *`} value={form.education} error={errors.education} onChange={(v) => { patchForm({ education: v }); clearError("education") }} disabled={locked} />
          <FieldError message={errMsg(errors.education)} />
        </div>
        <Field label={t("bio.currentEducation")} value={form.currentEducation} onChange={(v) => patchForm({ currentEducation: v })} disabled={locked} />
        <div data-form-field="profession">
          <Field label={`${t("bio.occupation")} *`} value={form.profession} error={errors.profession} onChange={(v) => { patchForm({ profession: v }); clearError("profession") }} disabled={locked} />
          <FieldError message={errMsg(errors.profession)} />
        </div>
        <Field label={t("bio.companyName")} value={form.companyName} onChange={(v) => patchForm({ companyName: v })} disabled={locked} />
        <div data-form-field="fatherName">
          <Field label={`${t("bio.fatherName")} *`} value={form.fatherName} error={errors.fatherName} onChange={(v) => { patchForm({ fatherName: v }); clearError("fatherName") }} disabled={locked} />
          <FieldError message={errMsg(errors.fatherName)} />
        </div>
        <div data-form-field="fatherOccupation">
          <Field label={`${t("bio.fatherOccupation")} *`} value={form.fatherOccupation} error={errors.fatherOccupation} onChange={(v) => { patchForm({ fatherOccupation: v }); clearError("fatherOccupation") }} disabled={locked} />
          <FieldError message={errMsg(errors.fatherOccupation)} />
        </div>
        <div data-form-field="motherName">
          <Field label={`${t("bio.motherName")} *`} value={form.motherName} error={errors.motherName} onChange={(v) => { patchForm({ motherName: v }); clearError("motherName") }} disabled={locked} />
          <FieldError message={errMsg(errors.motherName)} />
        </div>
        <div data-form-field="motherOccupation">
          <Field label={`${t("bio.motherOccupation")} *`} value={form.motherOccupation} error={errors.motherOccupation} onChange={(v) => { patchForm({ motherOccupation: v }); clearError("motherOccupation") }} disabled={locked} />
          <FieldError message={errMsg(errors.motherOccupation)} />
        </div>
        <Field label={t("bio.brothers")} value={form.brothers} onChange={(v) => patchForm({ brothers: v })} disabled={locked} type="number" />
        <Field label={t("bio.sisters")} value={form.sisters} onChange={(v) => patchForm({ sisters: v })} disabled={locked} type="number" />
        <div className="sm:col-span-2" data-form-field="familyType">
          <Label>{t("bio.familyType")} *</Label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { value: "Joint", label: t("bio.jointFamily") },
              { value: "Nuclear", label: t("bio.nuclearFamily") },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={locked}
                onClick={() => { patchForm({ familyType: opt.value }); clearError("familyType") }}
                className={cn(
                  "rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition",
                  form.familyType === opt.value
                    ? "border-maroon bg-maroon text-white"
                    : "border-gold-light bg-white text-maroon hover:border-gold"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <FieldError message={errMsg(errors.familyType)} />
        </div>
        <div data-form-field="contact">
          <Label>{t("bio.candidateMobile")} *</Label>
          <PhoneInput
            value={form.contact}
            onChange={(v) => { patchForm({ contact: v }); clearError("contact") }}
            disabled={locked}
            invalid={!!errors.contact}
          />
          <FieldError message={errMsg(errors.contact)} />
        </div>
        <div data-form-field="guardianMobile">
          <Label>{t("bio.guardianMobile")} *</Label>
          <PhoneInput
            value={form.guardianMobile}
            onChange={(v) => { patchForm({ guardianMobile: v }); clearError("guardianMobile") }}
            disabled={locked}
            invalid={!!errors.guardianMobile}
          />
          <FieldError message={errMsg(errors.guardianMobile)} />
        </div>
        <div className="sm:col-span-2">
          <Label>{t("bio.whatsapp")}</Label>
          <PhoneInput value={form.whatsappNumber} onChange={(v) => patchForm({ whatsappNumber: v })} disabled={locked} />
        </div>
      </div>
      </ProfileSection>

      <SectionHeading title={t("bio.uploadPhoto")} className="mt-8" />
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadBox
          label={`${t("bio.uploadPhoto")} *`}
          hint={t("bio.uploadHint")}
          dragging={dragging}
          onDragOver={(e) => { e.preventDefault(); if (!locked) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onPhotoDrop}
          onClick={() => !locked && photoRef.current?.click()}
          locked={locked}
          field="photo"
          error={errors.photo}
          errorMsg={errMsg(errors.photo)}
        >
          {profile.imageUrl || hasPhoto ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-gold">
              <SafeImage src={profile.imageUrl} name={profile.username ?? undefined} alt="" fill className="object-cover" sizes="80px" />
            </div>
          ) : (
            <UploadCloud className="h-8 w-8 text-gold" />
          )}
          <span className="flex items-center gap-1 text-xs text-maroon">
            <Camera className="h-3.5 w-3.5" /> {t("bio.changePhoto")}
          </span>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={locked} />
        </UploadBox>

        <UploadBox
          label={t("bio.uploadCast")}
          hint={t("bio.uploadHint")}
          dragging={castDragging}
          onDragOver={(e) => { e.preventDefault(); if (!locked) setCastDragging(true) }}
          onDragLeave={() => setCastDragging(false)}
          onDrop={onCastDrop}
          onClick={() => !locked && castRef.current?.click()}
          locked={locked}
        >
          {castUrl ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-maroon">
              <FileText className="h-6 w-6 text-gold" />
              <span className="truncate">{castUrl.split("/").pop()}</span>
            </div>
          ) : (
            <UploadCloud className="h-8 w-8 text-gold" />
          )}
          <span className="text-xs text-muted-foreground">{t("bio.uploadCast")}</span>
          <input ref={castRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleCastUpload} disabled={locked} />
        </UploadBox>
      </div>

      <ProfileSection
        title={t("bio.sectionExtras")}
        className="mt-6"
        dirty={sectionDirty.extras}
        saved={savedFlash === "extras"}
        saving={savingSection === "extras"}
        onSave={() => saveSection("extras")}
        saveLabel={t("bio.saveSection")}
        unsavedLabel={t("bio.unsavedChanges")}
        savedLabel={t("bio.sectionSaved")}
        disabled={locked}
      >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("bio.hobbies")} value={form.hobbies} onChange={(v) => patchForm({ hobbies: v })} disabled={locked} multiline />
        <Field label={t("bio.additionalDetails")} value={form.additionalDetails} onChange={(v) => patchForm({ additionalDetails: v })} disabled={locked} multiline />
      </div>
      </ProfileSection>

      <div className="mt-6 rounded-xl border border-gold-light bg-cream-dark p-4" data-form-field="declaration">
        <Label className="text-base font-bold text-maroon">{t("bio.declaration")} *</Label>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("bio.declarationText")}</p>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={declarationAccepted}
            onChange={(e) => { setDeclarationAccepted(e.target.checked); clearError("declaration") }}
            disabled={locked}
            className="mt-1 h-4 w-4 rounded border-gold accent-maroon"
          />
          <span className="text-sm font-semibold text-maroon">{t("bio.declaration")}</span>
        </label>
        <FieldError message={errMsg(errors.declaration)} />
      </div>

      {!locked && (sectionDirty.candidate || sectionDirty.education || sectionDirty.extras) && (
        <Button className="mt-6 w-full" variant="outline" onClick={handleSaveAll} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? t("bio.saving") : t("bio.save")}
        </Button>
      )}
    </Card>
  )

  const previewPanel = (
    <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
      <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
        <div className="no-print mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-xl font-bold text-maroon sm:text-2xl">{t("bio.preview")}</h2>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> {t("bio.print")}
          </Button>
        </div>

        <div id="biodata-card" className="box-border w-full min-w-0 rounded-2xl border-2 border-maroon bg-cream p-4 sm:border-4 sm:p-6 md:p-8">
          <div className="text-center">
            <div className="mb-2 text-base font-bold text-maroon sm:text-lg">॥ श्री गणेशाय नमः ॥</div>
            <div className="font-heading text-xl font-bold text-maroon sm:text-2xl">{t("bio.biodataTitle")}</div>
            <div className="text-sm text-gold sm:text-base">{t("bio.kshatriya")}</div>
          </div>

          <div className="mx-auto my-5 flex justify-center sm:my-6">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-gold sm:h-32 sm:w-32">
              <SafeImage src={profile.imageUrl} name={profile.username ?? undefined} alt="" fill className="object-cover" sizes="128px" />
            </div>
          </div>

          <table className="w-full min-w-0 table-fixed text-xs sm:text-sm">
            <tbody className="divide-y divide-gold-light">
              <PreviewRow label={t("bio.name")} value={form.username} />
              <PreviewRow label={t("bio.candidateType")} value={form.type === "GROOM" ? t("auth.groom") : t("auth.bride")} />
              <PreviewRow label={t("bio.birthDate")} value={formatDob(form.dob)} />
              <PreviewRow label={t("bio.age")} value={computedAge !== null ? String(computedAge) : ""} />
              <PreviewRow label={t("bio.gender")} value={form.gender} />
              <PreviewRow label={t("bio.height")} value={form.height} />
              <PreviewRow label={t("bio.fullAddress")} value={form.address} />
              <PreviewRow label={t("bio.district")} value={form.district} />
              <PreviewRow label={t("modal.gotraSelf")} value={form.gotraSelf} />
              <PreviewRow label={t("modal.gotraMother")} value={form.gotraMother} />
              <PreviewRow label={t("bio.highestQualification")} value={form.education} />
              <PreviewRow label={t("bio.currentEducation")} value={form.currentEducation} />
              <PreviewRow label={t("bio.occupation")} value={form.profession} />
              <PreviewRow label={t("bio.companyName")} value={form.companyName} />
              <PreviewRow label={t("bio.fatherName")} value={form.fatherName} />
              <PreviewRow label={t("bio.fatherOccupation")} value={form.fatherOccupation} />
              <PreviewRow label={t("bio.motherName")} value={form.motherName} />
              <PreviewRow label={t("bio.motherOccupation")} value={form.motherOccupation} />
              <PreviewRow label={t("bio.brothers")} value={form.brothers} />
              <PreviewRow label={t("bio.sisters")} value={form.sisters} />
              <PreviewRow label={t("bio.familyType")} value={form.familyType === "Joint" ? t("bio.jointFamily") : form.familyType === "Nuclear" ? t("bio.nuclearFamily") : form.familyType} />
              <PreviewRow label={t("bio.candidateMobile")} value={form.contact} />
              <PreviewRow label={t("bio.guardianMobile")} value={form.guardianMobile} />
              <PreviewRow label={t("bio.whatsapp")} value={form.whatsappNumber} />
              <PreviewRow label={t("bio.hobbies")} value={form.hobbies} />
              <PreviewRow label={t("bio.additionalDetails")} value={form.additionalDetails} />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )

  return (
    <>
      <div className="hidden min-w-0 gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-start">
        {editPanel}
        {previewPanel}
      </div>

      <div className="w-full min-w-0 lg:hidden">
        <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as "edit" | "preview")} className="w-full min-w-0">
          <TabsList className="mb-4 grid h-11 w-full grid-cols-2 p-1">
            <TabsTrigger value="edit" className="text-sm">{t("bio.tabEdit")}</TabsTrigger>
            <TabsTrigger value="preview" className="text-sm">{t("bio.tabPreview")}</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-0">{editPanel}</TabsContent>
          <TabsContent value="preview" className="mt-0">{previewPanel}</TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function ProfileSection({
  title,
  children,
  dirty,
  saved,
  saving,
  onSave,
  saveLabel,
  unsavedLabel,
  savedLabel,
  disabled,
  className,
}: {
  title: string
  children: React.ReactNode
  dirty: boolean
  saved: boolean
  saving: boolean
  onSave: () => void
  saveLabel: string
  unsavedLabel: string
  savedLabel: string
  disabled?: boolean
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border-2 p-4 transition sm:p-5", dirty ? "border-saffron bg-saffron-light/20" : "border-gold-light bg-white", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg font-bold text-maroon">{title}</h3>
        {dirty && !saved && (
          <span className="rounded-full bg-saffron px-2.5 py-0.5 text-xs font-bold text-white">{unsavedLabel}</span>
        )}
        {saved && (
          <span className="rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-bold text-white">{savedLabel}</span>
        )}
      </div>
      {children}
      {!disabled && dirty && (
        <Button type="button" size="sm" className="mt-4 w-full sm:w-auto" onClick={onSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "..." : saveLabel}
        </Button>
      )}
    </section>
  )
}

function SectionHeading({ title, className }: { title: string; className?: string }) {
  return (
    <h3 className={cn("mb-4 border-b border-gold-light pb-2 font-heading text-lg font-bold text-maroon", className)}>
      {title}
    </h3>
  )
}

function UploadBox({
  label,
  hint,
  dragging,
  locked,
  field,
  error,
  errorMsg,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: {
  label: string
  hint: string
  dragging: boolean
  locked: boolean
  field?: string
  error?: string
  errorMsg?: string
  children: React.ReactNode
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
}) {
  return (
    <div data-form-field={field}>
      <Label className="mb-2">{label}</Label>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 transition sm:p-6",
          locked && "pointer-events-none opacity-60",
          dragging ? "border-saffron bg-saffron-light" : "border-gold bg-cream-dark hover:bg-cream",
          error && "border-destructive"
        )}
      >
        <span className="text-center text-xs text-muted-foreground">{hint}</span>
        {children}
      </div>
      {errorMsg && <FieldError message={errorMsg} />}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  disabled,
  readOnly,
  type = "text",
  placeholder,
  children,
  multiline,
  field,
  error,
}: {
  label: string
  value?: string
  onChange?: (v: string) => void
  disabled?: boolean
  readOnly?: boolean
  type?: string
  placeholder?: string
  children?: React.ReactNode
  multiline?: boolean
  field?: string
  error?: string
}) {
  return (
    <div className="min-w-0 space-y-2" data-form-field={field}>
      <Label>{label}</Label>
      {children || (multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          rows={3}
          className={cn(
            "flex min-h-[80px] w-full rounded-2xl border-2 border-gold-hover bg-white px-4 py-3 text-sm shadow-sm transition placeholder:text-muted-foreground focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10 disabled:cursor-not-allowed disabled:opacity-60",
            error && "border-destructive focus:border-destructive focus:ring-red-100"
          )}
        />
      ) : (
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          className={error ? "border-destructive focus:border-destructive focus:ring-red-100" : undefined}
        />
      ))}
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string | null }) {
  return (
    <tr>
      <td className="w-[42%] py-2 pr-2 align-top font-semibold text-maroon">{label}</td>
      <td className="py-2 text-right align-top [overflow-wrap:anywhere]">{value || "-"}</td>
    </tr>
  )
}
