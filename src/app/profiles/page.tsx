import { Suspense } from "react"
import { Header } from "@/components/layout/Header"
import { getSession } from "@/lib/auth/session"
import { searchProfiles, getProfileByUserId } from "@/lib/services/profileService"
import { getDashboardStats } from "@/lib/services/dashboardService"
import { getAdminContactPhone } from "@/lib/services/adminContactService"
import { ProfilesClient } from "@/components/profiles/ProfilesClient"
import { ProfileAccessLocked } from "@/components/profiles/ProfileAccessLocked"
import { MemberAppShell } from "@/components/layout/MemberAppShell"
import { Footer } from "@/components/layout/Footer"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Find Matches",
  description:
    "Browse verified Kshatriya Mewada Rajput matrimonial profiles. Filter by gotra, district, age, and height to find the right family match.",
  alternates: { canonical: "/profiles" },
}

export default async function ProfilesPage() {
  const session = await getSession()

  if (!session) {
    return (
      <>
        <Header />
        <ProfileAccessLocked kind="noSession" />
        <Footer />
      </>
    )
  }

  const [firstPage, stats, adminPhone, myProfile] = await Promise.all([
    searchProfiles({ page: 1, pageSize: 9 }),
    getDashboardStats(session.id),
    getAdminContactPhone(),
    getProfileByUserId(session.id),
  ])

  return (
    <>
      <Header />
      <Suspense fallback={<div className="min-h-screen bg-cream" />}>
        <MemberAppShell role={session.role} pendingInterests={stats.pendingInterests}>
          <ProfilesClient
            initialProfiles={firstPage.profiles}
            initialTotal={firstPage.total}
            user={session}
            approvalStatus={myProfile?.approvalStatus ?? null}
            adminPhone={adminPhone}
          />
        </MemberAppShell>
      </Suspense>
    </>
  )
}
