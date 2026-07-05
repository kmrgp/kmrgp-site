"use client"

import { Eye, Heart, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useCountUp } from "@/lib/hooks/useCountUp"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { DashboardStats } from "@/lib/services/dashboardService"

interface DashboardStatsCardsProps {
  stats: DashboardStats
  /** Home uses 3 cols when views > 0; dashboard always shows all three. */
  variant?: "home" | "dashboard"
  className?: string
}

export function DashboardStatsCards({ stats, variant = "home", className = "" }: DashboardStatsCardsProps) {
  const { t } = useLang()
  const showViews = variant === "dashboard" || stats.profileViews > 0
  const gridCols =
    showViews && variant === "home"
      ? "grid-cols-3"
      : showViews
        ? "grid-cols-1 min-[420px]:grid-cols-3"
        : "grid-cols-2 min-[420px]:grid-cols-2"

  return (
    <div className={`grid gap-2 sm:gap-4 ${gridCols} ${className}`}>
      {showViews && <StatCard icon={Eye} value={stats.profileViews} label={t("dash.views")} />}
      <StatCard icon={Heart} value={stats.interestsReceived} label={t("dash.interests")} />
      <StatCard icon={Sparkles} value={stats.acceptedMatches} label={t("dash.newMatches")} />
    </div>
  )
}

function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  const { value: display, ref } = useCountUp(value)
  return (
    <Card className="min-w-0 overflow-hidden p-3 sm:p-5">
      <div className="flex flex-col items-center gap-1.5 text-center lg:flex-row lg:gap-4 lg:text-left">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron/10 text-saffron lg:h-11 lg:w-11">
          <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
        </div>
        <div className="min-w-0">
          <div ref={ref} className="font-heading text-lg font-bold text-maroon lg:text-2xl">
            {display}
          </div>
          <div className="line-clamp-2 text-[10px] leading-tight text-muted-foreground lg:line-clamp-none lg:text-sm">
            {label}
          </div>
        </div>
      </div>
    </Card>
  )
}
