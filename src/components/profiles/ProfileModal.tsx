"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Phone, Lock, ShieldCheck, ZoomIn, Clock, Send } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import { PhotoLightbox } from "@/components/ui/PhotoLightbox"
import { getContactStatusAction, requestContactAction } from "@/lib/actions/contactRequest"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { PublicProfile } from "@/types"

interface ProfileModalProps {
  profile: PublicProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isLoggedIn: boolean
}

export function ProfileModal({ profile, open, onOpenChange, isLoggedIn }: ProfileModalProps) {
  const { t } = useLang()
  const [lightbox, setLightbox] = useState(false)
  const [contactStatus, setContactStatus] = useState<"PENDING" | "APPROVED" | null | undefined>(undefined)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!open || !profile || !isLoggedIn) {
      setContactStatus(undefined)
      return
    }

    let cancelled = false
    getContactStatusAction(profile.userId).then((res) => {
      if (!cancelled && res.success) {
        setContactStatus(res.status)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, profile, isLoggedIn])

  if (!profile) return null

  const src = profile.imageUrl ?? null
  const hasDirectContact = isLoggedIn && profile.contact && profile.contact !== "-"
  const showContact = contactStatus === "APPROVED" || hasDirectContact

  async function handleRequestContact() {
    if (!profile || requesting) return
    setRequesting(true)
    const res = await requestContactAction(profile.userId)
    setRequesting(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setContactStatus("PENDING")
    toast.success(t("profiles.contactRequested"))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto overscroll-contain pr-1">
          <DialogTitle className="sr-only">{profile.username ?? ""}</DialogTitle>
          <DialogDescription className="sr-only">{t("card.view")} — {profile.username}</DialogDescription>

          <div className="flex flex-col gap-6 md:flex-row">
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="group relative mx-auto h-48 w-48 shrink-0 cursor-zoom-in md:mx-0"
              aria-label={`Zoom photo of ${profile.username}`}
            >
              <div className="relative h-48 w-48 overflow-hidden rounded-2xl border-4 border-gold">
                <SafeImage
                  src={src}
                  name={profile.username ?? undefined}
                  alt={profile.username ?? ""}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              </div>
              <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
                <ZoomIn className="h-4 w-4" />
              </div>
            </button>

            <div className="flex-1">
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
                          <Lock className="h-5 w-5" />
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

              <div className="mt-5">
                {isLoggedIn ? (
                  showContact && profile.contact ? (
                    <a href={`tel:+91${profile.contact}`} className="flex items-center gap-3 rounded-xl bg-saffron/10 p-4 text-maroon">
                      <Phone className="h-5 w-5 text-saffron" />
                      <div>
                        <div className="text-xs font-bold text-muted-foreground">{t("modal.contact")}</div>
                        <div className="font-bold">+91 {profile.contact}</div>
                      </div>
                    </a>
                  ) : contactStatus === "PENDING" ? (
                    <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-amber-700">
                      <Clock className="h-5 w-5" />
                      <div>
                        <div className="font-bold">{t("modal.contactPending")}</div>
                        <div className="text-xs">{t("modal.contactPendingDesc")}</div>
                      </div>
                    </div>
                  ) : (
                    <Button className="w-full" onClick={handleRequestContact} disabled={requesting}>
                      <Send className="mr-2 h-4 w-4" />
                      {requesting ? t("modal.requesting") : t("modal.requestContact")}
                    </Button>
                  )
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-cream-dark p-4 text-maroon">
                    <Lock className="h-5 w-5" />
                    <div>
                      <div className="font-bold">{t("modal.contactHidden")}</div>
                      <div className="text-xs">{t("modal.contactHiddenDesc")}</div>
                    </div>
                  </div>
                )}
              </div>

            </div>
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
      <td className="py-2 font-semibold text-maroon">{label}</td>
      <td className="py-2 text-right text-muted-foreground">{value || "-"}</td>
    </tr>
  )
}
