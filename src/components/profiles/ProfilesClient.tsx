"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { RotateCcw, Search, SlidersHorizontal, Unlock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ProfileCard } from "./ProfileCard"
import { ProfileModal } from "./ProfileModal"
import { ContactAdminDialog } from "./ContactAdminDialog"
import { FilterSelect } from "@/components/ui/FilterSelect"
import { SUGGESTED_DISTRICTS } from "@/lib/constants/districts"
import { requestContactAction, getContactStatusesAction, getContactStatusAction } from "@/lib/actions/contactRequest"
import { searchProfilesAction } from "@/lib/actions/profiles"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { ContactRequestStatus } from "@/lib/services/contactRequestService"
import type { ApprovalStatus, PublicProfile, SessionUser } from "@/types"

interface ProfilesClientProps {
  initialProfiles: PublicProfile[]
  user: SessionUser | null
  approvalStatus: ApprovalStatus | null
  initialTotal: number
  adminPhone: string | null
}

type SortKey = "default" | "ageAsc" | "ageDesc" | "heightAsc" | "heightDesc" | "verifiedFirst"

const HEIGHT_FILTER_OPTIONS = [
  { value: 0, labelKey: "profiles.anyHeight" as const },
  { value: 60, label: "5'0\"" },
  { value: 63, label: "5'3\"" },
  { value: 66, label: "5'6\"" },
  { value: 69, label: "5'9\"" },
  { value: 72, label: "6'0\"" },
]

const PAGE_SIZE = 9

export function ProfilesClient({ initialProfiles, user, approvalStatus, initialTotal, adminPhone }: ProfilesClientProps) {
  const { t } = useLang()
  const [selected, setSelected] = useState<PublicProfile | null>(null)
  const [contactStatuses, setContactStatuses] = useState<Record<number, ContactRequestStatus>>({})
  const [approvedContacts, setApprovedContacts] = useState<Record<number, string | null>>({})
  const [contactDialog, setContactDialog] = useState<{
    open: boolean
    profile: PublicProfile | null
    status: ContactRequestStatus
    approvedContact: string | null
  }>({ open: false, profile: null, status: null, approvedContact: null })

  const [gender, setGender] = useState("all")
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(35)
  const [community, setCommunity] = useState("all")
  const [district, setDistrict] = useState("all")
  const [gotraQuery, setGotraQuery] = useState("")
  const [gotraExclude, setGotraExclude] = useState("")
  const [keyword, setKeyword] = useState("")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [heightMin, setHeightMin] = useState(0)
  const [sort, setSort] = useState<SortKey>("default")

  const [page, setPage] = useState(1)
  const [results, setResults] = useState<PublicProfile[]>(initialProfiles)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const displayTotal = applied ? total : initialTotal
  const rangeStart = displayTotal === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, displayTotal)

  const loadContactStatuses = useCallback(async (profiles: PublicProfile[]) => {
    if (!user || profiles.length === 0) return
    const ownerIds = profiles.map((p) => p.userId)
    const res = await getContactStatusesAction(ownerIds)
    if (res.success) {
      setContactStatuses((prev) => ({ ...prev, ...res.statuses }))
      const approvedIds = ownerIds.filter((id) => res.statuses[id] === "APPROVED")
      if (approvedIds.length > 0) {
        const contacts: Record<number, string | null> = {}
        await Promise.all(
          approvedIds.map(async (id) => {
            const details = await getContactStatusAction(id)
            if (details.success && details.contact) contacts[id] = details.contact
          })
        )
        setApprovedContacts((prev) => ({ ...prev, ...contacts }))
      }
    }
  }, [user])

  useEffect(() => {
    loadContactStatuses(initialProfiles)
  }, [initialProfiles, loadContactStatuses])

  const buildFilters = useCallback(
    (forPage: number) => {
      const filters: Parameters<typeof searchProfilesAction>[0] = {
        gender: gender as "groom" | "bride" | "all",
        community,
        district,
        gotraQuery: gotraQuery.trim() || undefined,
        gotraExclude: gotraExclude.trim() || undefined,
        keyword: keyword.trim() || undefined,
        heightMinInches: heightMin || undefined,
        sort,
        page: forPage,
        pageSize: PAGE_SIZE,
      }
      if (applied) {
        filters.ageMin = ageMin
        filters.ageMax = ageMax
        filters.verifiedOnly = verifiedOnly
      }
      return filters
    },
    [gender, ageMin, ageMax, community, district, gotraQuery, gotraExclude, keyword, verifiedOnly, heightMin, sort, applied]
  )

  const runSearch = useCallback(
    async (forPage: number) => {
      setLoading(true)
      const res = await searchProfilesAction(buildFilters(forPage))
      setLoading(false)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setResults(res.data.profiles)
      setTotal(res.data.total)
      await loadContactStatuses(res.data.profiles)
    },
    [buildFilters, loadContactStatuses]
  )

  function applySearch() {
    setApplied(true)
    setPage(1)
    runSearch(1)
  }

  function gotoPage(p: number) {
    const clamped = Math.min(Math.max(1, p), totalPages)
    setPage(clamped)
    setApplied(true)
    runSearch(clamped)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function resetFilters() {
    setGender("all")
    setAgeMin(18)
    setAgeMax(35)
    setCommunity("all")
    setDistrict("all")
    setGotraQuery("")
    setGotraExclude("")
    setKeyword("")
    setVerifiedOnly(false)
    setHeightMin(0)
    setSort("default")
    setApplied(false)
    setPage(1)
    setResults(initialProfiles)
    setTotal(initialTotal)
    loadContactStatuses(initialProfiles)
  }

  function openContactDialog(profile: PublicProfile, status: ContactRequestStatus, approvedContact: string | null = null) {
    setContactDialog({ open: true, profile, status, approvedContact })
  }

  async function handleContact(profile: PublicProfile) {
    if (!user) {
      toast.info(t("profiles.loginToSend"))
      return
    }

    const existing = contactStatuses[profile.userId]
    if (existing === "PENDING") {
      openContactDialog(profile, "PENDING")
      return
    }
    if (existing === "APPROVED") {
      let contact = approvedContacts[profile.userId] ?? null
      if (!contact) {
        const details = await getContactStatusAction(profile.userId)
        if (details.success && details.contact) {
          contact = details.contact
          setApprovedContacts((prev) => ({ ...prev, [profile.userId]: contact }))
        }
      }
      openContactDialog(profile, "APPROVED", contact)
      return
    }
    if (existing === "REJECTED") {
      toast.info(t("profiles.contactRejectedRetry"))
    }

    const res = await requestContactAction(profile.userId)
    if (!res.success) {
      toast.error(res.error)
      return
    }

    setContactStatuses((prev) => ({ ...prev, [profile.userId]: "PENDING" }))
    if (res.alreadyRequested) {
      toast.info(t("profiles.contactAlreadyRequested"))
    } else {
      toast.success(t("profiles.contactRequested", { name: profile.username ?? "" }))
    }
    openContactDialog(profile, "PENDING")
  }

  const handleContactStatusChange = useCallback((userId: number, status: ContactRequestStatus, contact: string | null) => {
    setContactStatuses((prev) => ({ ...prev, [userId]: status }))
    if (contact) setApprovedContacts((prev) => ({ ...prev, [userId]: contact }))
  }, [])

  return (
    <>
      <section className="w-full min-w-0 bg-cream py-4 sm:py-6">
        <div className="mx-auto w-full min-w-0 max-w-6xl px-4 sm:px-6 lg:max-w-none lg:px-8">
          <div className="mb-5 sm:mb-6">
            <h1 className="font-heading text-2xl font-bold text-maroon sm:text-3xl">{t("profiles.results")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("profiles.subtitle")}</p>
          </div>

          {user && approvalStatus && approvalStatus !== "APPROVED" && user.role === "USER" && (
            <div
              className={`mb-5 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold sm:mb-6 sm:text-sm ${
                approvalStatus === "REJECTED"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : approvalStatus === "PENDING"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-slate-300 bg-slate-50 text-slate-900"
              }`}
            >
              <Unlock className="h-4 w-4 shrink-0" />
              {approvalStatus === "REJECTED"
                ? t("profiles.accountRejected")
                : approvalStatus === "PENDING"
                  ? t("profiles.accountPending")
                  : t("profiles.accountDraft")}
            </div>
          )}
          {user && (
            <div className="mb-5 flex flex-col gap-2 sm:mb-6">
              <div className="flex items-center gap-2 rounded-xl border border-gold bg-white px-3 py-2.5 text-xs font-semibold text-maroon sm:text-sm">
                <Unlock className="h-4 w-4 shrink-0 text-gold" />
                {t("profiles.contactViaAdmin")}
              </div>
            </div>
          )}

          <Card className="mb-5 min-w-0 overflow-hidden p-4 sm:mb-6 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 shrink-0 text-maroon" />
              <h2 className="font-heading text-lg font-bold text-maroon sm:text-xl">{t("profiles.filterTitle")}</h2>
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <FilterGroup label={t("profiles.lookingFor")}>
                <FilterSelect
                  value={gender}
                  onValueChange={setGender}
                  options={[
                    { value: "all", label: t("profiles.all") },
                    { value: "groom", label: t("profiles.groom") },
                    { value: "bride", label: t("profiles.bride") },
                  ]}
                />
              </FilterGroup>

              <FilterGroup label={t("profiles.ageRange")}>
                <div className="flex min-w-0 items-center gap-2">
                  <Input type="number" value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} className="min-h-10 min-w-0" />
                  <span className="shrink-0 text-gold">-</span>
                  <Input type="number" value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} className="min-h-10 min-w-0" />
                </div>
              </FilterGroup>

              <FilterGroup label={t("profiles.heightMin")}>
                <FilterSelect
                  value={String(heightMin)}
                  onValueChange={(v) => setHeightMin(Number(v))}
                  options={HEIGHT_FILTER_OPTIONS.map((o) => ({
                    value: String(o.value),
                    label: o.labelKey ? t(o.labelKey) : o.label!,
                  }))}
                />
              </FilterGroup>

              <FilterGroup label={t("profiles.sortBy")}>
                <FilterSelect
                  value={sort}
                  onValueChange={(v) => setSort(v as SortKey)}
                  options={[
                    { value: "default", label: t("profiles.sort.default") },
                    { value: "ageAsc", label: t("profiles.sort.ageAsc") },
                    { value: "ageDesc", label: t("profiles.sort.ageDesc") },
                    { value: "heightAsc", label: t("profiles.sort.heightAsc") },
                    { value: "heightDesc", label: t("profiles.sort.heightDesc") },
                    { value: "verifiedFirst", label: t("profiles.sort.verifiedFirst") },
                  ]}
                />
              </FilterGroup>

              <FilterGroup label={t("profiles.community")}>
                <FilterSelect
                  value={community}
                  onValueChange={setCommunity}
                  options={[
                    { value: "all", label: t("profiles.allCommunities") },
                    { value: "Mewada", label: "Mewada" },
                    { value: "Rajput", label: "Rajput" },
                  ]}
                />
              </FilterGroup>

              <FilterGroup label={t("profiles.district")}>
                <FilterSelect
                  value={district}
                  onValueChange={setDistrict}
                  options={[
                    { value: "all", label: t("profiles.allDistricts") },
                    ...SUGGESTED_DISTRICTS.map((d) => ({ value: d, label: d })),
                  ]}
                />
              </FilterGroup>

              <FilterGroup label={t("profiles.searchGotra")}>
                <Input value={gotraQuery} onChange={(e) => setGotraQuery(e.target.value)} placeholder={t("profiles.searchGotra")} />
              </FilterGroup>

              <FilterGroup label={t("profiles.excludeGotra")}>
                <Input value={gotraExclude} onChange={(e) => setGotraExclude(e.target.value)} placeholder={t("profiles.excludeGotra")} />
              </FilterGroup>

              <FilterGroup label={t("profiles.keyword")}>
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t("profiles.keyword")} />
              </FilterGroup>

              <div className="flex min-w-0 items-end">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="h-5 w-5 shrink-0 accent-maroon" />
                  <span className="text-sm font-semibold text-maroon">{t("profiles.verifiedOnly")}</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button variant="outline" className="w-full sm:w-auto" onClick={resetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" /> {t("profiles.reset")}
              </Button>
              <Button className="w-full sm:w-auto" onClick={applySearch} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {t("profiles.apply")}
              </Button>
            </div>
          </Card>

          <div className="mb-4 flex min-w-0 flex-col gap-1 border-b-2 border-gold-light pb-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-muted-foreground">
              {displayTotal > 0
                ? t("profiles.showingRange", { start: rangeStart, end: rangeEnd, total: displayTotal })
                : `0 ${t("profiles.matchesFound")}`}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-maroon" />
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gold bg-white p-12 text-center">
              <h4 className="font-heading text-xl font-bold text-maroon">{t("profiles.noMatches")}</h4>
              <p className="mt-2 text-muted-foreground">{t("profiles.noMatchesDesc")}</p>
            </div>
          ) : (
            <>
              <div className="columns-1 min-[480px]:columns-2 lg:columns-3 [column-gap:1.5rem]">
                {results.map((profile) => (
                  <ProfileCard
                    key={profile.userId}
                    profile={profile}
                    isLoggedIn={!!user}
                    contactStatus={contactStatuses[profile.userId] ?? null}
                    onView={() => setSelected(profile)}
                    onContact={() => handleContact(profile)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => gotoPage(page - 1)}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> {t("profiles.prev")}
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1]
                        const showEllipsis = prev != null && p - prev > 1
                        return (
                          <span key={p} className="flex items-center gap-2">
                            {showEllipsis && <span className="px-1 text-muted-foreground">…</span>}
                            <Button
                              variant={p === page ? "default" : "outline"}
                              size="sm"
                              className="min-w-9"
                              disabled={loading}
                              onClick={() => gotoPage(p)}
                            >
                              {p}
                            </Button>
                          </span>
                        )
                      })}
                    <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => gotoPage(page + 1)}>
                      {t("profiles.next")} <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("profiles.pageOf", { page, total: totalPages })}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <ProfileModal
        profile={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        isLoggedIn={!!user}
        adminPhone={adminPhone}
        contactStatus={selected ? contactStatuses[selected.userId] ?? null : null}
        approvedContact={selected ? approvedContacts[selected.userId] ?? null : null}
        onContactStatusChange={handleContactStatusChange}
        onOpenContactDialog={(profile, status, contact) => openContactDialog(profile, status, contact)}
      />

      <ContactAdminDialog
        open={contactDialog.open}
        onOpenChange={(open) => setContactDialog((prev) => ({ ...prev, open }))}
        adminPhone={adminPhone}
        profileName={contactDialog.profile?.username}
        status={contactDialog.status}
        approvedContact={contactDialog.approvedContact}
      />
    </>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}
