"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatIndianMobile, normalizeIndianMobile } from "@/lib/validation/phone"

interface PhoneInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: string
  onChange: (digits: string) => void
  invalid?: boolean
}

export function PhoneInput({ value, onChange, className, invalid, ...props }: PhoneInputProps) {
  return (
    <div className="flex min-w-0">
      <span
        className={cn(
          "flex min-h-[52px] shrink-0 items-center rounded-l-2xl border-2 border-r-0 bg-cream-dark px-3 text-sm font-bold text-maroon",
          invalid ? "border-destructive" : "border-gold-hover"
        )}
        aria-hidden="true"
      >
        +91
      </span>
      <Input
        {...props}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={11}
        value={formatIndianMobile(value)}
        onChange={(e) => onChange(normalizeIndianMobile(e.target.value))}
        className={cn(
          "min-w-0 rounded-l-none rounded-r-2xl border-l-0 px-4 sm:px-5",
          invalid && "border-destructive focus:border-destructive focus:ring-red-100",
          className
        )}
        aria-invalid={invalid || undefined}
      />
    </div>
  )
}
