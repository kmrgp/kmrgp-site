"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  SUGGESTED_DISTRICTS,
  matchSuggestedDistrict,
  normalizeDistrictInput,
} from "@/lib/constants/districts"
import { useLang } from "@/lib/i18n/LanguageProvider"

interface DistrictFieldProps {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
}

export function DistrictField({ id, value, onChange, disabled, invalid }: DistrictFieldProps) {
  const { t, tEn } = useLang()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const normalized = normalizeDistrictInput(query)
  const filtered = SUGGESTED_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(normalized.toLowerCase())
  )
  const exactMatch = matchSuggestedDistrict(query)
  const showCustom =
    normalized.length > 0 && !exactMatch

  function commit(valueToCommit: string) {
    const trimmed = normalizeDistrictInput(valueToCommit)
    const matched = matchSuggestedDistrict(trimmed)
    const final = matched ?? trimmed
    onChange(final)
    setQuery(final)
    setOpen(false)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return
    if (normalized) commit(normalized)
    else setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <Input
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={tEn("auth.districtPlaceholder")}
        disabled={disabled}
        autoComplete="address-level2"
        className={invalid ? "border-destructive focus:border-destructive focus:ring-red-100" : undefined}
        aria-invalid={invalid || undefined}
      />
      {open && !disabled && (filtered.length > 0 || showCustom) && (
        <ul
          role="listbox"
          className="kmrgp-scroll absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-2xl border-2 border-gold-light bg-cream p-1.5 shadow-xl"
        >
          {filtered.map((d) => (
            <li key={d} role="option" aria-selected={exactMatch === d}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-left text-base font-medium transition-colors hover:bg-saffron-light hover:text-maroon",
                  exactMatch === d && "bg-maroon-light font-semibold text-maroon"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(d)}
              >
                {d}
              </button>
            </li>
          ))}
          {showCustom && (
            <li role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-saffron transition-colors hover:bg-saffron-light hover:text-maroon"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(normalized)}
              >
                {t("auth.districtUseCustom", { name: normalized })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
