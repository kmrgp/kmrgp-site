import { countAcceptedMatches, countPendingReceivedInterests, countReceivedInterests } from "@/lib/services/interestService"

export interface DashboardStats {
  profileViews: number
  interestsReceived: number
  acceptedMatches: number
  pendingInterests: number
}

export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  const [interestsReceived, acceptedMatches, pendingInterests] = await Promise.all([
    countReceivedInterests(userId),
    countAcceptedMatches(userId),
    countPendingReceivedInterests(userId),
  ])

  return {
    profileViews: 0,
    interestsReceived,
    acceptedMatches,
    pendingInterests,
  }
}
