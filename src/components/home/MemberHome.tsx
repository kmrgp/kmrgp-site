"use client"

import Link from "next/link"
import { Search, User, Heart, ChevronRight, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardStatsCards } from "@/components/dashboard/DashboardStatsCards"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { cn } from "@/lib/utils"
import type { PublicProfile } from "@/types"
import type { DashboardStats } from "@/lib/services/dashboardService"

interface MemberHomeProps {
  username: string | null
  profile: PublicProfile | null
  stats: DashboardStats
}

export function MemberHome({ username, profile, stats }: MemberHomeProps) {
  const { t } = useLang()
  const firstName = username?.split(" ")[0] ?? profile?.username?.split(" ")[0] ?? t("dash.member")

  const approvalLabel =
    profile?.approvalStatus === "APPROVED"
      ? t("member.statusApproved")
      : profile?.approvalStatus === "PENDING"
        ? t("member.statusPending")
        : profile?.approvalStatus === "REJECTED"
          ? t("member.statusRejected")
          : t("member.statusDraft")

  const statusAccent =
    profile?.approvalStatus === "APPROVED"
      ? "bg-green-50 text-green-700"
      : profile?.approvalStatus === "PENDING"
        ? "bg-amber-50 text-amber-800"
        : profile?.approvalStatus === "REJECTED"
          ? "bg-red-50 text-red-700"
          : "bg-slate-50 text-slate-700"

  return (
    <main className="w-full min-w-0 bg-cream">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-maroon sm:text-3xl">{t("dash.hello", { name: firstName })}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{t("member.homeSub")}</p>
        </div>

        {stats.pendingInterests > 0 && (
          <Card className="mb-5 border-saffron/40 bg-saffron/5 p-4 sm:mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 shrink-0 text-saffron" />
                <p className="text-sm font-semibold text-maroon">
                  {t("dash.pendingCount", { n: stats.pendingInterests })}
                </p>
              </div>
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href="/dashboard?tab=interests">
                  {t("member.viewInterests")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        )}

        <DashboardStatsCards stats={stats} className="mb-6 sm:mb-8" />

        <h2 className="mb-3 font-heading text-lg font-bold text-maroon sm:mb-4 sm:text-xl">{t("member.quickActions")}</h2>
        <div className="mb-8 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-2 lg:gap-4 xl:grid-cols-4">
          <ActionCard
            href="/profiles"
            icon={Search}
            title={t("dash.browseMatches")}
            desc={t("member.actionBrowse")}
            accent="bg-saffron/10 text-saffron"
          />
          <ActionCard
            href="/dashboard"
            icon={User}
            title={t("dash.tabProfile")}
            desc={t("member.actionProfile")}
            accent="bg-maroon/10 text-maroon"
          />
          <ActionCard
            href="/dashboard?tab=interests"
            icon={Heart}
            title={t("dash.tabInterests")}
            desc={t("member.actionInterests")}
            accent="bg-gold/15 text-gold"
            badge={stats.pendingInterests > 0 ? stats.pendingInterests : undefined}
          />
          <ActionCard
            href="/dashboard"
            icon={ShieldCheck}
            title={t("member.profileStatus")}
            desc={approvalLabel}
            accent={statusAccent}
          />
        </div>

        <div className="rounded-2xl border border-gold-light bg-white p-5 text-center lg:p-8">
          <p className="font-heading text-lg font-bold text-maroon sm:text-xl">{t("member.ctaTitle")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("member.ctaSub")}</p>
          <Button asChild className="mt-5 w-full sm:w-auto" size="lg">
            <Link href="/profiles">
              <Search className="mr-2 h-5 w-5" />
              {t("home.browseProfiles")}
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

function ActionCard({
  href,
  icon: Icon,
  title,
  desc,
  accent,
  badge,
}: {
  href: string
  icon: React.ElementType
  title: string
  desc: string
  accent: string
  badge?: number
}) {
  return (
    <Link href={href} className="group block min-w-0">
      <Card className="h-full p-4 transition hover:border-gold hover:shadow-md lg:p-5">
        <div className="flex items-start gap-3">
          <div className={cn("relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accent)}>
            <Icon className="h-5 w-5" />
            {badge != null && badge > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-saffron px-1 text-[9px] font-bold text-white">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-bold text-maroon group-hover:text-saffron lg:text-base">{title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground lg:text-sm">{desc}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gold opacity-0 transition group-hover:opacity-100 lg:opacity-100" />
        </div>
      </Card>
    </Link>
  )
}
