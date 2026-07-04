"use client"

import { useState } from "react"
import { MapPin, Calendar, Ruler, Eye, Phone, Lock, ZoomIn, Clock, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import { PhotoLightbox } from "@/components/ui/PhotoLightbox"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { cn } from "@/lib/utils"
import type { ContactRequestStatus } from "@/lib/services/contactRequestService"
import type { PublicProfile } from "@/types"

interface ProfileCardProps {
  profile: PublicProfile
  isLoggedIn: boolean
  contactStatus?: ContactRequestStatus
  onView: () => void
  onContact: () => void
}

export function ProfileCard({ profile, isLoggedIn, contactStatus = null, onView, onContact }: ProfileCardProps) {
  const { t } = useLang()
  const [lightbox, setLightbox] = useState(false)
  const src = profile.imageUrl ?? null

  const contactLabel =
    contactStatus === "APPROVED"
      ? t("card.contactApproved")
      : contactStatus === "PENDING"
        ? t("card.contactPending")
        : t("card.contact")

  return (
    <>
      <Card className="group mb-4 inline-block w-full break-inside-avoid overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
        <div
          className={cn("relative w-full bg-cream-dark", src && "cursor-zoom-in")}
          onClick={() => src && setLightbox(true)}
          role="button"
          aria-label={`Zoom photo of ${profile.username}`}
        >
          <SafeImage
            src={src}
            name={profile.username ?? undefined}
            alt={profile.username ?? ""}
            natural
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          {src && (
            <div className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
              <ZoomIn className="h-4 w-4" />
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-full bg-saffron px-2.5 py-1 text-[10px] font-bold text-white sm:px-3 sm:text-xs">
            {profile.type === "GROOM" ? t("profiles.groom") : t("profiles.bride")}
          </div>
          {profile.visible && profile.approvalStatus === "APPROVED" && (
            <div className="absolute right-3 top-3 rounded-full bg-maroon px-2.5 py-1 text-[10px] font-bold text-white sm:px-3 sm:text-xs">
              {t("modal.verified")}
            </div>
          )}
        </div>
        <CardContent className="flex flex-col p-4 sm:p-5">
          <h3 className="mb-2 truncate font-heading text-lg font-bold text-maroon sm:text-xl">{profile.username}</h3>
          <div className="mb-3 flex flex-wrap gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2 py-1 text-[10px] font-semibold text-maroon sm:text-xs">
              <Calendar className="h-3 w-3 shrink-0" /> {profile.age ?? "-"} {t("profiles.yrs")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2 py-1 text-[10px] font-semibold text-maroon sm:text-xs">
              <Ruler className="h-3 w-3 shrink-0" /> {profile.height}
            </span>
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-cream-dark px-2 py-1 text-[10px] font-semibold text-maroon sm:text-xs">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{profile.district}</span>
            </span>
          </div>

          <table className="mb-3 w-full min-w-0 text-xs sm:text-sm">
            <tbody>
              <tr>
                <td className="py-0.5 font-semibold text-maroon">{t("card.education")}</td>
                <td className="py-0.5 text-right text-muted-foreground [overflow-wrap:anywhere]">{profile.education}</td>
              </tr>
              <tr>
                <td className="py-0.5 font-semibold text-maroon">{t("card.profession")}</td>
                <td className="py-0.5 text-right text-muted-foreground [overflow-wrap:anywhere]">{profile.profession}</td>
              </tr>
              <tr>
                <td className="py-0.5 font-semibold text-maroon">{t("card.community")}</td>
                <td className="py-0.5 text-right text-muted-foreground">{profile.community}</td>
              </tr>
            </tbody>
          </table>

          {!isLoggedIn && (
            <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold italic text-saffron sm:text-xs">
              <Lock className="h-3.5 w-3.5 shrink-0" /> {t("card.gotraHidden")}
            </p>
          )}

          <div className="mt-auto grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="min-w-0 px-2" onClick={onView}>
              <Eye className="mr-1 h-4 w-4 shrink-0" />
              <span className="truncate">{t("card.view")}</span>
            </Button>
            <Button
              size="sm"
              className="min-w-0 px-2"
              variant={contactStatus === "PENDING" ? "outline" : "default"}
              onClick={onContact}
            >
              {isLoggedIn ? (
                contactStatus === "PENDING" ? (
                  <><Clock className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">{contactLabel}</span></>
                ) : contactStatus === "APPROVED" ? (
                  <><CheckCircle2 className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">{contactLabel}</span></>
                ) : (
                  <><Phone className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">{contactLabel}</span></>
                )
              ) : (
                <><Lock className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">{t("card.unlock")}</span></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {src && (
        <PhotoLightbox
          open={lightbox}
          onOpenChange={setLightbox}
          src={src}
          name={profile.username ?? undefined}
        />
      )}
    </>
  )
}
