"use client"

import { Languages } from "lucide-react"
import { useLang, LANG_LABEL } from "@/lib/i18n/LanguageProvider"
import { cn } from "@/lib/utils"

/**
 * Language toggle — cycles EN ↔ Hindi with a micro flip animation.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggle, t } = useLang()
  const targetLabel = LANG_LABEL[lang === "en" ? "hi" : "en"]

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("lang.aria")}
      title={lang === "en" ? "हिंदी में देखें" : "View in English"}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-gold-light bg-white px-3 py-1.5 text-xs font-bold text-maroon transition-all duration-200 hover:border-gold hover:bg-gold-light hover:shadow-sm active:scale-95",
        className
      )}
    >
      <Languages className="h-3.5 w-3.5 text-gold transition-transform duration-300 group-hover:rotate-12" />
      <span key={targetLabel} className="inline-block min-w-[1.25rem] animate-lang-flip">
        {targetLabel}
      </span>
    </button>
  )
}
