"use client"

import { useState } from "react"
import { MapPin, Calendar, Ruler, Eye, Phone, Lock, ZoomIn } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import { PhotoLightbox } from "@/components/ui/PhotoLightbox"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { PublicProfile } from "@/types"

interface ProfileCardProps {
  profile: PublicProfile
  isLoggedIn: boolean
  onView: () => void
  onRequestContact: () => void
}

export function ProfileCard({ profile, isLoggedIn, onView, onRequestContact }: ProfileCardProps) {
  const { t } = useLang()
  const [lightbox, setLightbox] = useState(false)
  const src = profile.imageUrl ?? null

  return (
    <>
      <Card className="overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
        <div
          className={`relative h-64 ${src ? "cursor-zoom-in" : ""}`}
          onClick={() => src && setLightbox(true)}
          role="button"
          aria-label={`Zoom photo of ${profile.username}`}
        >
          <SafeImage
            src={src}
            name={profile.username ?? undefined}
            alt={profile.username ?? ""}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute left-3 top-3 rounded-full bg-saffron px-3 py-1 text-xs font-bold text-white">
            {profile.type === "GROOM" ? t("profiles.groom") : t("profiles.bride")}
          </div>
          {profile.visible && profile.approvalStatus === "APPROVED" && (
            <div className="absolute right-3 top-3 rounded-full bg-maroon px-3 py-1 text-xs font-bold text-white">
              {t("modal.verified")}
            </div>
          )}
          <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
            <ZoomIn className="h-4 w-4" />
          </div>
        </div>
        <CardContent className="p-5">
          <h3 className="mb-2 font-heading text-xl font-bold text-maroon">{profile.username}</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2 py-1 text-xs font-semibold text-maroon">
              <Calendar className="h-3 w-3" /> {profile.age ?? "-"} {t("profiles.yrs")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2 py-1 text-xs font-semibold text-maroon">
              <Ruler className="h-3 w-3" /> {profile.height}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2 py-1 text-xs font-semibold text-maroon">
              <MapPin className="h-3 w-3" /> {profile.district}
            </span>
          </div>

          <table className="mb-3 w-full text-sm">
            <tbody>
              <tr>
                <td className="font-semibold text-maroon">{t("card.education")}:</td>
                <td className="text-right text-muted-foreground">{profile.education}</td>
              </tr>
              <tr>
                <td className="font-semibold text-maroon">{t("card.profession")}:</td>
                <td className="text-right text-muted-foreground">{profile.profession}</td>
              </tr>
              <tr>
                <td className="font-semibold text-maroon">{t("card.community")}:</td>
                <td className="text-right text-muted-foreground">{profile.community}</td>
              </tr>
            </tbody>
          </table>

          {!isLoggedIn && (
            <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold italic text-saffron">
              <Lock className="h-3.5 w-3.5" /> {t("card.gotraHidden")}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onView}>
              <Eye className="mr-1 h-4 w-4" /> {t("card.view")}
            </Button>
            <Button className="flex-1" onClick={onRequestContact}>
              {isLoggedIn ? (
                <><Phone className="mr-1 h-4 w-4" /> {t("card.requestContact")}</>
              ) : (
                <><Lock className="mr-1 h-4 w-4" /> {t("card.unlock")}</>
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