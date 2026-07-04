"use client"

import { useState } from "react"
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { PublicProfile } from "@/types"

interface ProfileCompletenessProps {
  profile: PublicProfile
}

interface CheckItem {
  key: string
  done: boolean
}

export function ProfileCompleteness({ profile }: ProfileCompletenessProps) {
  const { t } = useLang()

  const checks: CheckItem[] = [
    { key: "dash.addPhoto", done: !!profile.imageUrl },
    { key: "bio.fullName", done: !!profile.username && profile.username.trim().length >= 2 },
    { key: "bio.gotraSelf", done: !!profile.gotraSelf && profile.gotraSelf.trim().length > 0 },
    { key: "profiles.district", done: !!profile.district && profile.district.trim().length > 0 },
    { key: "dash.addAddress", done: !!profile.address && profile.address !== "-" },
    { key: "dash.addFamily", done: !!(profile.fatherName && profile.motherName && profile.familyType) },
    { key: "bio.guardianMobile", done: !!profile.guardianMobile },
    { key: "bio.highestQualification", done: !!profile.education },
    { key: "bio.occupation", done: !!profile.profession },
  ]

  const doneCount = checks.filter((c) => c.done).length
  const pct = Math.round((doneCount / checks.length) * 100)
  const isComplete = doneCount === checks.length
  const [expanded, setExpanded] = useState(!isComplete)

  return (
    <Card className="mb-5 min-w-0 p-4 sm:mb-6 sm:p-5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold text-maroon sm:text-lg">{t("dash.completeness")}</h3>
          <p className="text-xs text-muted-foreground">{t("dash.completenessHint")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <div className="font-heading text-xl font-bold text-saffron sm:text-2xl">{pct}%</div>
            {isComplete && <div className="text-[10px] font-bold text-green-600 sm:text-xs">{t("dash.complete")}</div>}
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-dark">
        <div
          className="h-full rounded-full bg-gradient-to-r from-saffron to-maroon transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {expanded && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2 text-sm">
              {c.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              )}
              <span className={c.done ? "text-muted-foreground line-through" : "font-semibold text-maroon"}>
                {t(c.key as any)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
