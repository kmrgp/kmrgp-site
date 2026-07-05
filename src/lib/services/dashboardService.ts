import { countAcceptedMatches, countPendingReceivedInterests, countReceivedInterests } from "@/lib/services/interestService"
import { countProfileViews } from "@/lib/services/profileViewService"

export interface DashboardStats {
  profileViews: number
  interestsReceived: number
  acceptedMatches: number
  pendingInterests: number
}

export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  const [profileViews, interestsReceived, acceptedMatches, pendingInterests] = await Promise.all([
    countProfileViews(userId),
    countReceivedInterests(userId),
    countAcceptedMatches(userId),
    countPendingReceivedInterests(userId),
  ])

  return {
    profileViews,
    interestsReceived,
    acceptedMatches,
    pendingInterests,
  }
}
