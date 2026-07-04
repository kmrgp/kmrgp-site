"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Phone, Lock, ShieldCheck, ZoomIn, Clock, Heart } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import { PhotoLightbox } from "@/components/ui/PhotoLightbox"
import { getContactStatusAction, requestContactAction } from "@/lib/actions/contactRequest"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { cn } from "@/lib/utils"
import type { ContactRequestStatus } from "@/lib/services/contactRequestService"
import type { PublicProfile } from "@/types"

interface ProfileModalProps {
  profile: PublicProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isLoggedIn: boolean
  adminPhone: string | null
  contactStatus: ContactRequestStatus
  approvedContact: string | null
  onContactStatusChange: (userId: number, status: ContactRequestStatus, contact: string | null) => void
  onOpenContactDialog: (profile: PublicProfile, status: ContactRequestStatus, contact: string | null) => void
}

export function ProfileModal({
  profile,
  open,
  onOpenChange,
  isLoggedIn,
  adminPhone,
  contactStatus,
  approvedContact,
  onContactStatusChange,
  onOpenContactDialog,
}: ProfileModalProps) {
  const { t } = useLang()
  const [lightbox, setLightbox] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [localStatus, setLocalStatus] = useState<ContactRequestStatus>(contactStatus)
  const [localContact, setLocalContact] = useState<string | null>(approvedContact)

  useEffect(() => {
    setLocalStatus(contactStatus)
    setLocalContact(approvedContact)
  }, [contactStatus, approvedContact, profile?.userId])

  useEffect(() => {
    if (!open || !profile || !isLoggedIn) return

    let cancelled = false
    getContactStatusAction(profile.userId).then((res) => {
      if (!cancelled && res.success) {
        setLocalStatus(res.status)
        setLocalContact(res.contact)
        onContactStatusChange(profile.userId, res.status, res.contact)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, profile, isLoggedIn, onContactStatusChange])

  if (!profile) return null

  const src = profile.imageUrl ?? null

  async function handleContact() {
    if (!profile || requesting) return

    if (localStatus === "PENDING") {
      onOpenContactDialog(profile, "PENDING", null)
      return
    }
    if (localStatus === "APPROVED") {
      onOpenContactDialog(profile, "APPROVED", localContact)
      return
    }

    setRequesting(true)
    const res = await requestContactAction(profile.userId)
    setRequesting(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }

    setLocalStatus("PENDING")
    onContactStatusChange(profile.userId, "PENDING", null)
    if (res.alreadyRequested) {
      toast.info(t("profiles.contactAlreadyRequested"))
    } else {
      toast.success(t("profiles.contactRequested", { name: profile.username ?? "" }))
    }
    onOpenContactDialog(profile, "PENDING", null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(90dvh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <DialogTitle className="sr-only">{profile.username ?? ""}</DialogTitle>
            <DialogDescription className="sr-only">{t("card.view")} — {profile.username}</DialogDescription>

            <div className="flex flex-col gap-6">
              <button
                type="button"
                onClick={() => src && setLightbox(true)}
                className={cn("group relative w-full overflow-hidden rounded-2xl border-4 border-gold bg-cream-dark", src && "cursor-zoom-in")}
                aria-label={`Zoom photo of ${profile.username}`}
              >
                <SafeImage
                  src={src}
                  name={profile.username ?? undefined}
                  alt={profile.username ?? ""}
                  natural
                  sizes="(max-width: 768px) 100vw, 480px"
                />
                {src && (
                  <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
                    <ZoomIn className="h-4 w-4" />
                  </div>
                )}
              </button>

              <div className="min-w-0">
                <h2 className="font-heading text-2xl font-bold text-maroon">{profile.username}</h2>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-bold text-white">
                    <ShieldCheck className="h-3 w-3" /> {t("modal.verified")}
                  </span>
                  <span className="rounded-full bg-cream-dark px-3 py-1 text-xs font-bold text-maroon">{profile.type}</span>
                  <span className="rounded-full bg-cream-dark px-3 py-1 text-xs font-bold text-maroon">{profile.community}</span>
                </div>

                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gold-light">
                    <Row label={t("modal.ageHeight")} value={`${profile.age ?? "-"} yrs, ${profile.height}`} />
                    <Row label={t("card.education")} value={profile.education} />
                    <Row label={t("card.profession")} value={profile.profession} />
                    <Row label={t("profiles.district")} value={profile.district} />
                    {isLoggedIn ? (
                      <>
                        <Row label={t("modal.gotraSelf")} value={profile.gotraSelf} />
                        <Row label={t("modal.gotraMother")} value={profile.gotraMother} />
                        <Row label={t("modal.father")} value={profile.fatherName} />
                        <Row label={t("modal.mother")} value={profile.motherName} />
                        <Row label={t("modal.familyType")} value={profile.familyType} />
                        <Row label={t("modal.brothers")} value={profile.brothers} />
                        <Row label={t("modal.sisters")} value={profile.sisters} />
                        <Row label={t("modal.parentsOcc")} value={profile.parentsOccupation} />
                        <Row label={t("modal.address")} value={profile.address} />
                      </>
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-4">
                          <div className="flex items-center gap-3 rounded-xl bg-cream-dark p-4 text-maroon">
                            <Lock className="h-5 w-5 shrink-0" />
                            <div>
                              <div className="font-bold">{t("modal.restricted")}</div>
                              <div className="text-xs">{t("modal.restrictedDesc")}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-gold-light bg-white p-4 sm:p-5">
            {isLoggedIn ? (
              localStatus === "APPROVED" && localContact ? (
                <a
                  href={`tel:+91${localContact.replace(/\D/g, "")}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-saffron px-4 py-3 text-sm font-bold text-white"
                >
                  <Phone className="h-4 w-4" />
                  +91 {localContact}
                </a>
              ) : localStatus === "PENDING" ? (
                <Button variant="outline" className="w-full" onClick={() => onOpenContactDialog(profile, "PENDING", null)}>
                  <Clock className="mr-2 h-4 w-4" />
                  {t("card.contactPending")}
                </Button>
              ) : (
                <Button className="w-full" onClick={handleContact} disabled={requesting}>
                  <Phone className="mr-2 h-4 w-4" />
                  {requesting ? t("modal.requesting") : t("card.contact")}
                </Button>
              )
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-cream-dark p-4 text-maroon">
                <Lock className="h-5 w-5 shrink-0" />
                <div>
                  <div className="font-bold">{t("modal.contactHidden")}</div>
                  <div className="text-xs">{t("modal.contactHiddenDesc")}</div>
                </div>
              </div>
            )}
            {isLoggedIn && localStatus === "PENDING" && (
              <p className="mt-2 flex items-start gap-1.5 text-center text-xs text-muted-foreground">
                <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron" />
                {t("contact.interestSentNote")}
              </p>
            )}
            {isLoggedIn && adminPhone && localStatus !== "APPROVED" && (
              <p className="mt-2 text-center text-xs text-muted-foreground">{t("contact.adminHint")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {src && (
        <PhotoLightbox open={lightbox} onOpenChange={setLightbox} src={src} name={profile.username ?? undefined} />
      )}
    </>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <tr>
      <td className="py-2 pr-2 font-semibold text-maroon">{label}</td>
      <td className="py-2 text-right text-muted-foreground [overflow-wrap:anywhere]">{value || "-"}</td>
    </tr>
  )
}
