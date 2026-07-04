"use client"

import type { ReactNode } from "react"
import { Toaster } from "sonner"
import { LanguageProvider } from "@/lib/i18n/LanguageProvider"
import { LangAnimatedShell } from "@/components/layout/LangAnimatedShell"
import { ScrollLockFix } from "@/components/layout/ScrollLockFix"
import type { Lang } from "@/lib/i18n/dictionary"

export default function AppProviders({
  children,
  initialLang,
}: {
  children: ReactNode
  initialLang: Lang
}) {
  return (
    <LanguageProvider initialLang={initialLang}>
      <ScrollLockFix />
      <LangAnimatedShell>{children}</LangAnimatedShell>
      <Toaster
        position="top-center"
        offset={88}
        duration={4000}
        closeButton
        toastOptions={{
          style: {
            background: "#FFFDF7",
            border: "1px solid #C5A55A",
            color: "#800020",
          },
        }}
      />
    </LanguageProvider>
  )
}
