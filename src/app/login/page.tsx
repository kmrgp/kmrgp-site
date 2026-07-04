import { Suspense } from "react"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { LoginForm } from "@/components/auth/LoginForm"
import { getSession } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Kshatriya Mewada Rajput Parivar matrimonial account.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect("/dashboard")

  return (
    <>
      <Header />
      <Suspense>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  )
}
