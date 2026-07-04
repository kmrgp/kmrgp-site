"use client"

import Link from "next/link"
import { Heart, Sparkles, Eye, Shield, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthGatePanel } from "@/components/auth/AuthGatePanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { BioDataEditor } from "@/components/dashboard/BioDataEditor"
import { InterestsList } from "@/components/dashboard/InterestsList"
import { ProfileCompleteness } from "@/components/dashboard/ProfileCompleteness"
import { AdminPanel } from "@/components/dashboard/AdminPanel"
import { SuperAdminPanel } from "@/components/dashboard/SuperAdminPanel"
import { useCountUp } from "@/lib/hooks/useCountUp"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { PublicProfile, Role } from "@/types"

interface DashboardClientProps {
  profile: PublicProfile
  role: Role
}

export function DashboardClient({ profile, role }: DashboardClientProps) {
  const { t } = useLang()
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
  const isSuperAdmin = role === "SUPER_ADMIN"

  return (
    <main className="min-h-screen bg-cream pb-20 pt-[76px]">
      <section
        className="relative flex min-h-[320px] items-center justify-center bg-cover bg-center px-6 py-16"
        style={{ backgroundImage: "url('/images/ram_sita_vivah.png')" }}
      >
        <div className="absolute inset-0 bg-maroon/70" />
        <div className="relative z-10 mx-auto max-w-4xl text-center text-white">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold">
            <Sparkles className="h-4 w-4" /> {t("dash.workspace")}
          </div>
          <h1 className="font-heading text-3xl font-bold text-white md:text-4xl">{t("dash.welcome")}</h1>
          <p className="mt-2 text-cream-dark">{t("dash.preserving")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard icon={Eye} target={142} label={t("dash.views")} />
          <StatCard icon={Heart} target={28} label={t("dash.interests")} />
          <StatCard icon={Sparkles} target={12} label={t("dash.newMatches")} />
        </div>

        <Tabs defaultValue={isAdmin ? "admin" : "profile"} className="w-full">
          <TabsList className="mb-6 flex w-full flex-wrap justify-center gap-2 md:w-auto">
            <TabsTrigger value="profile">{t("dash.tabProfile")}</TabsTrigger>
            <TabsTrigger value="interests">{t("dash.tabInterests")}</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin"><Shield className="mr-1 h-4 w-4" /> {t("dash.tabAdmin")}</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="superadmin"><Crown className="mr-1 h-4 w-4" /> {t("dash.tabSuperAdmin")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile">
            {profile.approvalStatus !== "APPROVED" && <ProfileCompleteness profile={profile} />}
            <BioDataEditor profile={profile} role={role} />
          </TabsContent>

          <TabsContent value="interests">
            <InterestsList />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="superadmin">
              <SuperAdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </section>
    </main>
  )
}

function StatCard({ icon: Icon, target, label }: { icon: React.ElementType; target: number; label: string }) {
  const { value, ref } = useCountUp(target)
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-saffron/10 text-saffron">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div ref={ref} className="font-heading text-2xl font-bold text-maroon">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
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