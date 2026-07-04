import { Suspense } from "react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { HomeClient } from "@/components/home/HomeClient"
import { MemberHome } from "@/components/home/MemberHome"
import { MemberAppShell } from "@/components/layout/MemberAppShell"
import { getSession } from "@/lib/auth/session"
import { getMyProfile } from "@/lib/actions/profile"
import { getDashboardStats } from "@/lib/services/dashboardService"
import type { PublicProfile } from "@/types"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Home · Preserving Heritage, Uniting Families",
  description:
    "A trusted matrimonial platform for the Kshatriya Mewada Rajput community. Verified profiles, gotra-aware matching, and a dignified bio-data experience.",
  alternates: { canonical: "/" },
}

export default async function HomePage() {
  const session = await getSession()

  if (session) {
    const [profile, stats] = await Promise.all([getMyProfile(), getDashboardStats(session.id)])

    return (
      <>
        <Header />
        <Suspense fallback={<div className="min-h-screen bg-cream" />}>
          <MemberAppShell role={session.role} pendingInterests={stats.pendingInterests}>
            <MemberHome username={session.username} profile={profile ?? null} stats={stats} />
          </MemberAppShell>
        </Suspense>
      </>
    )
  }

  let featured: PublicProfile[] = []
  if (process.env.DATABASE_URL) {
    const { listFeaturedProfiles } = await import("@/lib/services/profileService")
    featured = await listFeaturedProfiles(3)
  }

  return (
    <>
      <Header />
      <HomeClient featured={featured} />
      <Footer />
    </>
  )
}
