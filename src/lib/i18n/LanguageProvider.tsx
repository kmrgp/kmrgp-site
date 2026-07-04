"use client"

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react"
import { DEFAULT_LANG, LANG_COOKIE, LANG_LABEL, type Lang, type DictKey, t as translate } from "./dictionary"

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  t: (key: DictKey, vars?: Record<string, string | number>) => string
  /** Placeholders / typed data hints — always English. */
  tEn: (key: DictKey, vars?: Record<string, string | number>) => string
  animKey: number
}

const Ctx = createContext<LangCtx | null>(null)

function readInitialLang(): Lang {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]+)`))
    if (match?.[1] === "en" || match?.[1] === "hi") return match[1] as Lang
  }
  return DEFAULT_LANG
}

export function LanguageProvider({ children, initialLang = DEFAULT_LANG }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const [animKey, setAnimKey] = useState(0)

  // Sync from cookie on client mount (in case server passed a stale default)
  useEffect(() => {
    const fromCookie = readInitialLang()
    if (fromCookie !== lang) setLangState(fromCookie)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply lang attribute + hindi font class to <html> for CSS targeting
  useEffect(() => {
    const html = document.documentElement
    html.lang = lang
    if (lang === "hi") html.classList.add("lang-hi")
    else html.classList.remove("lang-hi")
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    if (l === lang) return
    document.documentElement.classList.add("lang-switching")
    setLangState(l)
    setAnimKey((k) => k + 1)
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    window.setTimeout(() => {
      document.documentElement.classList.remove("lang-switching")
    }, 320)
  }, [lang])

  const toggle = useCallback(() => {
    setLang(lang === "en" ? "hi" : "en")
  }, [lang, setLang])

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  )

  const tEn = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => translate("en", key, vars),
    []
  )

  return <Ctx.Provider value={{ lang, setLang, toggle, t, tEn, animKey }}>{children}</Ctx.Provider>
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx)
  if (!ctx) {
    // Safe fallback so server components / unmounted usage never throws
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      toggle: () => {},
      t: (key, vars) => translate(DEFAULT_LANG, key, vars),
      tEn: (key, vars) => translate("en", key, vars),
      animKey: 0,
    }
  }
  return ctx
}

export { LANG_LABEL }