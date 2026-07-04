"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useLang } from "@/lib/i18n/LanguageProvider"

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const { t } = useLang()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative min-w-0">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-cream-dark hover:text-maroon"
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  )
}
