import { api, saveToken, clearToken } from "./client"
import type { AuthUser, RegistrationPlan } from "@/types"

export interface LoginResult {
  token: string
  user: AuthUser
}

export interface RegisterResult {
  token: string
  user: AuthUser
}

export interface PaymentOrderResult {
  orderRef: string
  amountInr: number
  planName: string
  planDurationDays: number
}

export interface CompleteRegistrationResult {
  token: string
  user: AuthUser
  alreadyRegistered: boolean
}

export async function login(loginId: string, password: string): Promise<LoginResult> {
  const result = await api.post<LoginResult>("/auth/login", { loginId, password }, { public: true })
  await saveToken(result.token)
  return result
}

export async function logout(): Promise<void> {
  try {
    await api.post<null>("/auth/logout")
  } finally {
    await clearToken()
  }
}

export async function getMe(): Promise<AuthUser> {
  return api.get<AuthUser>("/auth/me")
}

export async function register(data: {
  phone: string
  username: string
  password: string
  profileType: "GROOM" | "BRIDE"
  dob?: string
  gotraSelf?: string
  gotraMother?: string
  education?: string
  profession?: string
  district?: string
  community?: string
}): Promise<RegisterResult> {
  const result = await api.post<RegisterResult>("/auth/register", data, { public: true })
  await saveToken(result.token)
  return result
}

export async function getRegistrationPlan(): Promise<{ required: boolean; plan: RegistrationPlan | null }> {
  return api.get<{ required: boolean; plan: RegistrationPlan | null }>("/payment/plan", { public: true })
}

export async function createPaymentOrder(data: {
  phone: string
  username: string
  password: string
  profileType: "GROOM" | "BRIDE"
  dob?: string
  gotraSelf?: string
  gotraMother?: string
  education?: string
  profession?: string
  district?: string
  community?: string
}): Promise<PaymentOrderResult> {
  return api.post<PaymentOrderResult>("/payment/order", data, { public: true })
}

export async function completeRegistration(orderRef: string): Promise<CompleteRegistrationResult> {
  const result = await api.post<CompleteRegistrationResult>("/payment/complete", { orderRef }, { public: true })
  await saveToken(result.token)
  return result
}
