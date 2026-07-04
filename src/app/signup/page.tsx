import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { SignupForm } from "@/components/auth/SignupForm"
import { getSession } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Join Parivar",
  description: "Register your family on the Kshatriya Mewada Rajput Parivar matrimonial platform.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: false },
}

export default async function SignupPage() {
  const session = await getSession()
  if (session) redirect("/")

  return (
    <>
      <Header />
      <SignupForm />
      <Footer />
    </>
  )
}
