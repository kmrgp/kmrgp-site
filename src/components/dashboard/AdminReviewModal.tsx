"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { ApproveOptions } from "@/lib/actions/admin"
import {
  CheckCircle2,
  X,
  Trash2,
  RotateCcw,
  Phone,
  GraduationCap,
  Briefcase,
  Users,
  Home,
  Calendar,
  Ruler,
  Eye,
  Star,
} from "lucide-react"
import type { PublicProfile } from "@/types"

interface AdminReviewModalProps {
  profile: PublicProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (id: number, options?: ApproveOptions) => void
  onReject: (id: number) => void
  onDelete?: (id: number) => void
}

export function AdminReviewModal({
  profile,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onDelete,
}: AdminReviewModalProps) {
  const { t } = useLang()
  const [showPublic, setShowPublic] = useState(true)
  const [featureOnHome, setFeatureOnHome] = useState(false)

  if (!profile) return null

  const status = profile.approvalStatus
  const isPending = status === "PENDING"
  const isRejected = status === "REJECTED"
  const isApproved = status === "APPROVED"
  const isDraft = status === "SENT"

  const statusColor = isApproved
    ? "text-green-600"
    : isPending
      ? "text-amber-600"
      : isRejected
        ? "text-red-600"
        : "text-slate-600"

  const statusLabel = isApproved
    ? t("admin.statusApproved")
    : isPending
      ? t("admin.statusPending")
      : isRejected
        ? t("admin.statusRejected")
        : t("admin.statusDraft")

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setShowPublic(true)
          setFeatureOnHome(false)
        }
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto overscroll-contain pr-1 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold text-maroon">
            {t("admin.reviewTitle")}
          </DialogTitle>
          <DialogDescription>
            {profile.username} · {profile.type} ·{" "}
            <span className={`font-bold ${statusColor}`}>
              {statusLabel}
            </span>
            {profile.isSeed && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                {t("admin.seedBadge")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-gold">
              <SafeImage
                src={profile.imageUrl}
                name={profile.username ?? undefined}
                alt={profile.username ?? ""}
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-xl font-bold text-maroon">{profile.username}</h3>
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2 py-1 text-xs font-bold text-maroon">
                  <Phone className="h-3 w-3" /> {profile.phone}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2 py-1 text-xs font-bold text-maroon">
                  <Calendar className="h-3 w-3" /> {profile.dob}
                </span>
                {isApproved && (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                        profile.visible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      {profile.visible ? t("admin.onPublic") : t("admin.offPublic")}
                    </span>
                    {profile.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                        <Star className="h-3 w-3" /> {t("admin.featuredYes")}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail icon={Users} label={t("modal.gotraSelf")} value={profile.gotraSelf} />
            <Detail icon={Users} label={t("modal.gotraMother")} value={profile.gotraMother} />
            <Detail icon={Home} label={t("profiles.district")} value={profile.district} />
            <Detail icon={GraduationCap} label={t("modal.education")} value={profile.education} />
            <Detail icon={Briefcase} label={t("modal.profession")} value={profile.profession} />
            <Detail icon={Ruler} label={t("bio.height")} value={profile.height} />
          </div>

          <div className="rounded-xl border border-gold-light bg-cream/50 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-maroon">
              {t("modal.family")}
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">{t("modal.father")}: </span>
                {profile.fatherName}
              </div>
              <div>
                <span className="text-muted-foreground">{t("modal.mother")}: </span>
                {profile.motherName}
              </div>
              <div>
                <span className="text-muted-foreground">{t("modal.brothers")}: </span>
                {profile.brothers}
              </div>
              <div>
                <span className="text-muted-foreground">{t("modal.sisters")}: </span>
                {profile.sisters}
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">{t("modal.parentsOccupation")}: </span>
                {profile.parentsOccupation}
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">{t("admin.location")}: </span>
                {profile.address}
              </div>
            </div>
          </div>

          {(isPending || isRejected || isDraft) && (
            <div className="space-y-3 rounded-xl border border-gold-light bg-white p-4">
              {isDraft && (
                <p className="text-sm text-muted-foreground">{t("admin.draftHint")}</p>
              )}
              <p className="text-sm font-semibold text-maroon">{t("admin.publicOnApprove")}</p>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={showPublic}
                  onChange={(e) => setShowPublic(e.target.checked)}
                />
                <span>
                  <span className="font-semibold text-maroon">{t("admin.approveShowPublic")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t("admin.approveShowPublicDesc")}</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={featureOnHome}
                  disabled={!showPublic}
                  onChange={(e) => setFeatureOnHome(e.target.checked)}
                />
                <span>
                  <span className="font-semibold text-maroon">{t("admin.approveFeatureHome")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t("admin.approveFeatureHomeDesc")}</span>
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-gold-light pt-4">
            {isDraft && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onReject(profile.userId)
                    onOpenChange(false)
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> {t("admin.reject")}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    onApprove(profile.userId, { showPublic, featureOnHome })
                    onOpenChange(false)
                  }}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> {t("admin.approve")}
                </Button>
              </>
            )}
            {isPending && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onReject(profile.userId)
                    onOpenChange(false)
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> {t("admin.reject")}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    onApprove(profile.userId, { showPublic, featureOnHome })
                    onOpenChange(false)
                  }}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> {t("admin.approve")}
                </Button>
              </>
            )}
            {isRejected && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  onApprove(profile.userId, { showPublic, featureOnHome })
                  onOpenChange(false)
                }}
              >
                <RotateCcw className="mr-1 h-4 w-4" /> {t("admin.reApprove")}
              </Button>
            )}
            {(isApproved || isRejected) && onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(profile.userId)
                  onOpenChange(false)
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> {t("admin.delete")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-semibold text-maroon">{value && value !== "-" ? value : "—"}</div>
      </div>
    </div>
  )
}
