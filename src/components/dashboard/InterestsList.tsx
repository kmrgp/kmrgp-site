"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Heart, CheckCircle2, X, HeartOff, Phone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SafeImage } from "@/components/ui/safe-image"
import { ContactAdminDialog } from "@/components/profiles/ContactAdminDialog"
import {
  getMyInterestsAction,
  getMySentInterestsAction,
  getMyAcceptedInterestsAction,
  acceptInterestAction,
  declineInterestAction,
} from "@/lib/actions/interest"
import { getContactStatusesAction, getAdminContactPhoneAction, requestContactAction, getContactStatusAction } from "@/lib/actions/contactRequest"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { ContactRequestStatus } from "@/lib/services/contactRequestService"

interface InterestItem {
  id: number
  senderId: number
  receiverId: number
  name: string | null
  imageUrl: string | null
  type: string | null
  age: number | null
  gotraSelf: string | null
  gotraMother: string | null
  district: string | null
  contact: string | null
  status: string
  createdAt: Date
}

export function InterestsList() {
  const { t } = useLang()
  const [received, setReceived] = useState<InterestItem[]>([])
  const [sent, setSent] = useState<InterestItem[]>([])
  const [acceptedReceived, setAcceptedReceived] = useState<InterestItem[]>([])
  const [acceptedSent, setAcceptedSent] = useState<InterestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adminPhone, setAdminPhone] = useState<string | null>(null)
  const [contactStatuses, setContactStatuses] = useState<Record<number, ContactRequestStatus>>({})
  const [approvedContacts, setApprovedContacts] = useState<Record<number, string | null>>({})
  const [contactDialog, setContactDialog] = useState<{
    open: boolean
    name: string | null
    status: ContactRequestStatus
    approvedContact: string | null
  }>({ open: false, name: null, status: null, approvedContact: null })

  const loadContactMeta = useCallback(async (items: InterestItem[]) => {
    const uniqueOther = [...new Set(items.flatMap((i) => [i.senderId, i.receiverId]))]
    if (uniqueOther.length === 0) return

    const res = await getContactStatusesAction(uniqueOther)
    if (!res.success) return

    setContactStatuses((prev) => ({ ...prev, ...res.statuses }))

    const approvedIds = uniqueOther.filter((id) => res.statuses[id] === "APPROVED")
    if (approvedIds.length === 0) return

    const contacts: Record<number, string | null> = {}
    await Promise.all(
      approvedIds.map(async (id) => {
        const details = await getContactStatusAction(id)
        if (details.success && details.contact) contacts[id] = details.contact
      })
    )
    setApprovedContacts((prev) => ({ ...prev, ...contacts }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [rRes, sRes, aRes, adminRes] = await Promise.all([
      getMyInterestsAction(),
      getMySentInterestsAction(),
      getMyAcceptedInterestsAction(),
      getAdminContactPhoneAction(),
    ])
    setLoading(false)
    if (adminRes.success) setAdminPhone(adminRes.phone)

    const receivedItems = rRes.success ? (rRes.interests as InterestItem[]) : []
    const sentItems = sRes.success ? (sRes.interests as InterestItem[]) : []
    const acceptedR = aRes.success ? (aRes.received as InterestItem[]) : []
    const acceptedS = aRes.success ? (aRes.sent as InterestItem[]) : []

    if (rRes.success) setReceived(receivedItems)
    if (sRes.success) setSent(sentItems)
    if (aRes.success) {
      setAcceptedReceived(acceptedR)
      setAcceptedSent(acceptedS)
    }

    await loadContactMeta([...receivedItems, ...sentItems, ...acceptedR, ...acceptedS])
  }, [loadContactMeta])

  useEffect(() => {
    load()
  }, [load])

  async function accept(id: number) {
    const res = await acceptInterestAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(t("int.accepted"))
    load()
  }

  async function decline(id: number) {
    const res = await declineInterestAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.info(t("int.declined"))
    load()
  }

  async function requestContactFor(ownerId: number, name: string | null) {
    const existing = contactStatuses[ownerId]
    if (existing === "PENDING") {
      setContactDialog({ open: true, name, status: "PENDING", approvedContact: null })
      return
    }
    if (existing === "APPROVED") {
      setContactDialog({ open: true, name, status: "APPROVED", approvedContact: approvedContacts[ownerId] ?? null })
      return
    }

    const res = await requestContactAction(ownerId)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setContactStatuses((prev) => ({ ...prev, [ownerId]: "PENDING" }))
    toast.success(t("profiles.contactRequested", { name: name ?? "" }))
    setContactDialog({ open: true, name, status: "PENDING", approvedContact: null })
  }

  if (loading) return <div className="text-center text-muted-foreground">{t("int.loading")}</div>

  return (
    <>
      <Tabs defaultValue="received" className="w-full min-w-0">
        <TabsList className="mb-4 grid h-auto min-h-11 w-full min-w-0 grid-cols-3 gap-1 p-1">
          <TabsTrigger value="received" className="min-w-0 whitespace-normal px-1 text-center text-[10px] leading-tight sm:px-3 sm:text-sm">
            {t("int.tabReceived")} ({received.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="min-w-0 whitespace-normal px-1 text-center text-[10px] leading-tight sm:px-3 sm:text-sm">
            {t("int.tabSent")} ({sent.length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="min-w-0 whitespace-normal px-1 text-center text-[10px] leading-tight sm:px-3 sm:text-sm">
            {t("int.tabAccepted")} ({acceptedReceived.length + acceptedSent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {received.length === 0 ? (
            <EmptyState icon={HeartOff} text={t("int.none")} />
          ) : (
            <div className="space-y-4">
              {received.map((item) => {
                const ownerId = item.senderId
                const approved = contactStatuses[ownerId] === "APPROVED" ? approvedContacts[ownerId] : null
                return (
                  <InterestRow
                    key={item.id}
                    item={item}
                    approvedContact={approved}
                    actions={
                      item.status === "PENDING" ? (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => requestContactFor(ownerId, item.name)}>
                            <Phone className="mr-1 h-4 w-4" /> {t("contact.viaAdmin")}
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => decline(item.id)}>
                            <X className="mr-1 h-4 w-4" /> {t("int.decline")}
                          </Button>
                          <Button size="sm" className="flex-1" onClick={() => accept(item.id)}>
                            <Heart className="mr-1 h-4 w-4" /> {t("int.accept")}
                          </Button>
                        </div>
                      ) : (
                        <StatusBadge status={item.status} t={t} />
                      )
                    }
                    t={t}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sent.length === 0 ? (
            <EmptyState icon={Send} text={t("int.sentNone")} />
          ) : (
            <div className="space-y-4">
              {sent.map((item) => {
                const ownerId = item.receiverId
                const approved = contactStatuses[ownerId] === "APPROVED" ? approvedContacts[ownerId] : null
                return (
                  <InterestRow
                    key={item.id}
                    item={item}
                    approvedContact={approved}
                    actions={<StatusBadge status={item.status} t={t} />}
                    t={t}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted">
          {acceptedReceived.length + acceptedSent.length === 0 ? (
            <EmptyState icon={Heart} text={t("int.acceptedNone")} />
          ) : (
            <div className="space-y-6">
              {acceptedReceived.length > 0 && (
                <div>
                  <h4 className="mb-3 font-heading text-lg font-bold text-maroon">{t("int.tabReceived")}</h4>
                  <div className="space-y-4">
                    {acceptedReceived.map((item) => (
                      <InterestRow
                        key={item.id}
                        item={item}
                        approvedContact={contactStatuses[item.senderId] === "APPROVED" ? approvedContacts[item.senderId] : null}
                        actions={null}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}
              {acceptedSent.length > 0 && (
                <div>
                  <h4 className="mb-3 font-heading text-lg font-bold text-maroon">{t("int.tabSent")}</h4>
                  <div className="space-y-4">
                    {acceptedSent.map((item) => (
                      <InterestRow
                        key={item.id}
                        item={item}
                        approvedContact={contactStatuses[item.receiverId] === "APPROVED" ? approvedContacts[item.receiverId] : null}
                        actions={null}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ContactAdminDialog
        open={contactDialog.open}
        onOpenChange={(open) => setContactDialog((prev) => ({ ...prev, open }))}
        adminPhone={adminPhone}
        profileName={contactDialog.name}
        status={contactDialog.status}
        approvedContact={contactDialog.approvedContact}
      />
    </>
  )
}

function InterestRow({
  item,
  approvedContact,
  actions,
  t,
}: {
  item: InterestItem
  approvedContact: string | null | undefined
  actions: React.ReactNode
  t: (key: any, vars?: Record<string, string | number>) => string
}) {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-gold sm:h-14 sm:w-14">
          <SafeImage
            src={item.imageUrl}
            name={item.name ?? undefined}
            alt={item.name ?? ""}
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="truncate font-heading text-base font-bold text-maroon sm:text-lg">{item.name}</div>
          <div className="text-xs text-muted-foreground sm:text-sm">
            {item.age ?? "-"} {t("profiles.yrs")} · {item.gotraSelf} · {item.district}
          </div>
          {approvedContact ? (
            <a href={`tel:+91${approvedContact.replace(/\D/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-saffron">
              <Phone className="h-3.5 w-3.5" /> +91 {approvedContact}
            </a>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{t("contact.adminHint")}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div>}
    </Card>
  )
}

function StatusBadge({ status, t }: { status: string; t: (key: any) => string }) {
  const label = status === "ACCEPTED" ? t("int.acceptedBadge") : status === "DECLINED" ? t("int.declinedBadge") : t("int.pending")
  const color = status === "ACCEPTED" ? "bg-green-100 text-green-700" : status === "DECLINED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${color}`}>
      {status === "ACCEPTED" && <CheckCircle2 className="h-3 w-3" />}
      {label}
    </span>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <Card className="p-8 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-gold" />
      <p className="font-semibold text-muted-foreground">{text}</p>
    </Card>
  )
}
