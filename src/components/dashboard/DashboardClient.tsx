"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Heart, Shield, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthGatePanel } from "@/components/auth/AuthGatePanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BioDataEditor } from "@/components/dashboard/BioDataEditor"
import { InterestsList } from "@/components/dashboard/InterestsList"
import { ProfileCompleteness } from "@/components/dashboard/ProfileCompleteness"
import { DashboardStatsCards } from "@/components/dashboard/DashboardStatsCards"
import { AdminPanel } from "@/components/dashboard/AdminPanel"
import { SuperAdminPanel } from "@/components/dashboard/SuperAdminPanel"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { PublicProfile, Role } from "@/types"
import type { DashboardStats } from "@/lib/services/dashboardService"

export type DashboardTab = "profile" | "interests" | "admin" | "superadmin"

interface DashboardClientProps {
  profile: PublicProfile
  role: Role
  stats: DashboardStats
}

function parseTab(raw: string | null, isAdmin: boolean, isSuperAdmin: boolean): DashboardTab {
  if (raw === "interests") return "interests"
  if (raw === "admin" && isAdmin) return "admin"
  if (raw === "superadmin" && isSuperAdmin) return "superadmin"
  return "profile"
}

export function DashboardClient({ profile, role, stats }: DashboardClientProps) {
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
  const isSuperAdmin = role === "SUPER_ADMIN"

  const tabFromUrl = parseTab(searchParams.get("tab"), isAdmin, isSuperAdmin)
  const [activeTab, setActiveTab] = useState<DashboardTab>(tabFromUrl)
  const [liveProfile, setLiveProfile] = useState(profile)

  useEffect(() => {
    setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  useEffect(() => {
    setLiveProfile(profile)
  }, [profile])

  const handleProfileUpdate = useCallback((patch: Partial<PublicProfile>) => {
    setLiveProfile((prev) => ({ ...prev, ...patch }))
  }, [])

  function setTab(tab: DashboardTab) {
    setActiveTab(tab)
    const qs = tab === "profile" ? "" : `?tab=${tab}`
    router.replace(`/dashboard${qs}`, { scroll: false })
  }

  return (
    <main className="min-h-screen w-full min-w-0 bg-cream">
        <section className="mx-auto w-full min-w-0 max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:max-w-none lg:px-8 lg:py-6">
          <Tabs value={activeTab} onValueChange={(v) => setTab(v as DashboardTab)} className="w-full min-w-0">
            <TabsList className="mb-6 hidden h-auto min-h-12 w-full flex-wrap justify-center gap-1.5 p-1 md:inline-flex lg:hidden">
              <TabsTrigger value="profile" className="px-4 text-sm">
                {t("dash.tabProfile")}
              </TabsTrigger>
              <TabsTrigger value="interests" className="px-4 text-sm">
                {t("dash.tabInterests")}
                {stats.pendingInterests > 0 && (
                  <span className="ml-1.5 rounded-full bg-saffron px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {stats.pendingInterests}
                  </span>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="px-4 text-sm">
                  <Shield className="mr-1 h-4 w-4" /> {t("dash.tabAdmin")}
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="superadmin" className="px-4 text-sm">
                  <Crown className="mr-1 h-4 w-4" /> {t("dash.tabSuperAdmin")}
                </TabsTrigger>
              )}
            </TabsList>

            <div className="mb-4">
              <h1 className="font-heading text-xl font-bold text-maroon sm:text-2xl">
                {activeTab === "profile" && t("dash.tabProfile")}
                {activeTab === "interests" && t("dash.tabInterests")}
                {activeTab === "admin" && t("dash.tabAdmin")}
                {activeTab === "superadmin" && t("dash.tabSuperAdmin")}
              </h1>
            </div>

            {activeTab === "profile" && (
              <DashboardStatsCards stats={stats} variant="dashboard" className="mb-6" />
            )}

            <TabsContent value="profile" className="mt-0 min-w-0 focus-visible:outline-none">
              {activeTab === "profile" && (
                <>
                  {liveProfile.approvalStatus !== "APPROVED" && (
                    <ProfileCompleteness profile={liveProfile} />
                  )}
                  <BioDataEditor
                    profile={liveProfile}
                    role={role}
                    onProfileUpdate={handleProfileUpdate}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="interests" className="mt-0 focus-visible:outline-none">
              {activeTab === "interests" && <InterestsList />}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="mt-0 focus-visible:outline-none">
                {activeTab === "admin" && <AdminPanel />}
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="superadmin" className="mt-0 focus-visible:outline-none">
                {activeTab === "superadmin" && <SuperAdminPanel />}
              </TabsContent>
            )}
          </Tabs>
        </section>
      </main>
  )
}

export function DashboardLocked({ kind }: { kind: "noSession" | "notFound" }) {
  const { t } = useLang()

  if (kind === "notFound") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6 pt-[76px]">
        <div className="max-w-md rounded-3xl border-4 border-double border-maroon bg-white p-10 text-center shadow-lg">
          <h2 className="type-h2 mb-2">{t("dash.profileMissing")}</h2>
          <p className="type-body-sm mb-6 text-muted-foreground">{t("dash.profileMissingDesc")}</p>
          <Button asChild className="w-full">
            <Link href="/signup">{t("nav.joinParivar")}</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 pt-[76px]">
      <AuthGatePanel />
    </main>
  )
}
