import { Suspense } from "react"
import { Header } from "@/components/layout/Header"
import { DashboardClient, DashboardLocked } from "@/components/dashboard/DashboardClient"
import { MemberAppShell } from "@/components/layout/MemberAppShell"
import { getSession } from "@/lib/auth/session"
import { getMyProfile } from "@/lib/actions/profile"
import { getDashboardStats } from "@/lib/services/dashboardService"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "My Dashboard",
  description:
    "Manage your bio-data, review interests, and track your matrimonial connections.",
  alternates: { canonical: "/dashboard" },
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    return (
      <>
        <Header />
        <DashboardLocked kind="noSession" />
      </>
    )
  }

  const [profile, stats] = await Promise.all([getMyProfile(), getDashboardStats(session.id)])

  if (!profile) {
    return (
      <>
        <Header />
        <DashboardLocked kind="notFound" />
      </>
    )
  }

  return (
    <>
      <Header />
      <Suspense fallback={<div className="min-h-screen bg-cream" />}>
        <MemberAppShell role={session.role} pendingInterests={stats.pendingInterests}>
          <DashboardClient profile={profile} role={session.role} stats={stats} />
        </MemberAppShell>
      </Suspense>
    </>
  )
}
