"use client"

import { Phone, Clock, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { ContactRequestStatus } from "@/lib/services/contactRequestService"

interface ContactAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adminPhone: string | null
  profileName?: string | null
  status: ContactRequestStatus
  approvedContact?: string | null
}

export function ContactAdminDialog({
  open,
  onOpenChange,
  adminPhone,
  profileName,
  status,
  approvedContact,
}: ContactAdminDialogProps) {
  const { t } = useLang()
  const formattedAdmin = adminPhone ? `+91 ${adminPhone}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-maroon">
            {status === "APPROVED" ? t("contact.approvedTitle") : t("contact.adminTitle")}
          </DialogTitle>
          <DialogDescription>
            {status === "APPROVED"
              ? t("contact.approvedDesc", { name: profileName ?? "" })
              : t("contact.adminDesc", { name: profileName ?? "" })}
          </DialogDescription>
        </DialogHeader>

        {status === "APPROVED" && approvedContact ? (
          <a
            href={`tel:+91${approvedContact.replace(/\D/g, "")}`}
            className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-maroon"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-muted-foreground">{t("modal.contact")}</div>
              <div className="font-bold">+91 {approvedContact}</div>
            </div>
          </a>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-relaxed">{t("contact.pendingNote")}</p>
            </div>

            {formattedAdmin ? (
              <div className="rounded-xl border border-gold-light bg-cream-dark p-4">
                <p className="mb-2 text-sm font-semibold text-maroon">{t("contact.callAdmin")}</p>
                <a
                  href={`tel:+91${adminPhone}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-maroon px-4 py-3 text-sm font-bold text-white"
                >
                  <Phone className="h-4 w-4" />
                  {formattedAdmin}
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("contact.noAdminPhone")}</p>
            )}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
          {t("contact.close")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
