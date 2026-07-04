"use client"

import type { ReactNode } from "react"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { cn } from "@/lib/utils"

/** Wraps page content; animates only on language switch (not on modal open). */
export function LangAnimatedShell({ children }: { children: ReactNode }) {
  const { lang, animKey } = useLang()

  return (
    <div
      id="app-content"
      key={`${lang}-${animKey}`}
      className={cn("min-h-screen", animKey > 0 && "animate-content-in")}
    >
      {children}
    </div>
  )
}
