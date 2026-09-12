import { api } from "./client"
import type { InterestWithProfile } from "@/types"

export async function getReceivedInterests(): Promise<{ interests: InterestWithProfile[]; count: number }> {
  return api.get("/interests?type=received")
}

export async function getSentInterests(): Promise<{ interests: InterestWithProfile[] }> {
  return api.get("/interests?type=sent")
}

export async function getAcceptedInterests(): Promise<{ received: InterestWithProfile[]; sent: InterestWithProfile[] }> {
  return api.get("/interests?type=accepted")
}

export async function getInterestCounts(): Promise<{ pending: number; accepted: number }> {
  return api.get("/interests/counts")
}

export async function sendInterest(receiverId: number): Promise<{ alreadySent: boolean }> {
  return api.post("/interests", { receiverId })
}

export async function respondToInterest(interestId: number, action: "ACCEPTED" | "DECLINED"): Promise<null> {
  return api.patch(`/interests/${interestId}`, { action })
}
