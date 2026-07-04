"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Heart, Shield, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthGatePanel } from "@/components/auth/AuthGatePanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BioDataEditor } from "@/components/dashboard/BioDataEditor"
import { InterestsList } from "@/components/dashboard/InterestsList"
import { ProfileCompleteness } from "@/components/dashboard/ProfileCompleteness"
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

  useEffect(() => {
    setActiveTab(tabFromUrl)
  }, [tabFromUrl])

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

            <TabsContent value="profile" className="mt-0 min-w-0 focus-visible:outline-none">
              {activeTab === "profile" && (
                <>
                  {profile.approvalStatus !== "APPROVED" && <ProfileCompleteness profile={profile} />}
                  <BioDataEditor profile={profile} role={role} />
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

export function DashboardLocked({ kind }: { kind: "noSession" | "notFound" | "pending" }) {
  const { t } = useLang()
  if (kind === "noSession") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6 pt-[76px]">
        <AuthGatePanel />
      </main>
    )
  }
  if (kind === "notFound") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6 pt-[76px]">
        <AuthGatePanel />
      </main>
    )
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 pt-[76px]">
      <div className="max-w-lg rounded-3xl border-2 border-dashed border-gold bg-white p-10 text-center">
        <Shield className="mx-auto mb-4 h-12 w-12 text-gold" />
        <h2 className="mb-2 font-heading text-2xl font-bold text-maroon">{t("dash.verificationPending")}</h2>
        <p className="mb-6 text-muted-foreground">{t("dash.verificationDesc")}</p>
        <Button asChild className="w-full">
          <Link href="/dashboard">{t("dash.goDashboard")}</Link>
        </Button>
      </div>
    </main>
  )
}
