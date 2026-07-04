"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Shield,
  UserCheck,
  Eye,
  Phone,
  CheckCircle,
  XCircle,
  Users,
  Loader2,
  Trash2,
  Search,
  RotateCcw,
  LayoutGrid,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AdminReviewModal } from "@/components/dashboard/AdminReviewModal"
import { ConfirmDeleteDialog } from "@/components/dashboard/ConfirmDeleteDialog"
import { PublicDisplayPanel } from "@/components/dashboard/PublicDisplayPanel"
import { SubscriptionPlansPanel } from "@/components/dashboard/SubscriptionPlansPanel"
import {
  listPendingRequestsAction,
  listRejectedRequestsAction,
  listAllMembersAction,
  approveUserAction,
  rejectUserAction,
  deleteUserAction,
  type ApproveOptions,
} from "@/lib/actions/admin"
import {
  listPendingContactRequestsAction,
  approveContactRequestAction,
  rejectContactRequestAction,
} from "@/lib/actions/contactRequest"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { PublicProfile } from "@/types"

interface ContactRequest {
  id: number
  requesterId: number
  requesterName: string | null
  requesterPhone: string | null
  ownerId: number
  ownerName: string | null
  ownerPhone: string | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: Date
}

export function AdminPanel() {
  const { t } = useLang()
  const [pendingProfiles, setPendingProfiles] = useState<PublicProfile[]>([])
  const [rejectedProfiles, setRejectedProfiles] = useState<PublicProfile[]>([])
  const [allMembers, setAllMembers] = useState<PublicProfile[]>([])
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewProfile, setReviewProfile] = useState<PublicProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PublicProfile | null>(null)
  const [query, setQuery] = useState("")

  async function load() {
    setLoading(true)
    const [pRes, rRes, mRes, cRes] = await Promise.all([
      listPendingRequestsAction(),
      listRejectedRequestsAction(),
      listAllMembersAction(),
      listPendingContactRequestsAction(),
    ])
    setLoading(false)
    if (pRes.success) setPendingProfiles(pRes.pending as PublicProfile[])
    if (rRes.success) setRejectedProfiles(rRes.rejected as PublicProfile[])
    if (mRes.success) setAllMembers(mRes.members as PublicProfile[])
    if (cRes.success) setContactRequests(cRes.requests as ContactRequest[])
  }

  useEffect(() => {
    load()
  }, [])

  async function approve(id: number, options?: ApproveOptions) {
    const res = await approveUserAction(id, options)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(t("admin.approvedToast"))
    load()
  }

  async function reject(id: number) {
    const res = await rejectUserAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.info(t("admin.rejectedToast"))
    load()
  }

  async function remove(id: number) {
    const res = await deleteUserAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(t("admin.deleted"))
    load()
  }

  async function approveContact(id: number) {
    const res = await approveContactRequestAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(t("admin.contactApproved"))
    load()
  }

  async function rejectContact(id: number) {
    const res = await rejectContactRequestAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.info(t("admin.contactRejected"))
    load()
  }

  const matchesSearch = useCallback((profile: PublicProfile) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      (profile.username?.toLowerCase().includes(q) ?? false) ||
      (profile.phone?.toLowerCase().includes(q) ?? false) ||
      (profile.district?.toLowerCase().includes(q) ?? false) ||
      (profile.gotraSelf?.toLowerCase().includes(q) ?? false) ||
      (profile.gotraMother?.toLowerCase().includes(q) ?? false)
    )
  }, [query])

  const filteredMembers = useMemo(() => allMembers.filter(matchesSearch), [allMembers, matchesSearch])
  const filteredPending = useMemo(() => pendingProfiles.filter(matchesSearch), [pendingProfiles, matchesSearch])
  const filteredRejected = useMemo(() => rejectedProfiles.filter(matchesSearch), [rejectedProfiles, matchesSearch])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("admin.loading")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={UserCheck}
          value={pendingProfiles.length}
          label={t("admin.pending")}
          tone="amber"
        />
        <StatCard
          icon={Phone}
          value={contactRequests.length}
          label={t("admin.contactRequests")}
          tone="blue"
        />
        <StatCard
          icon={Users}
          value={allMembers.filter((p) => p.approvalStatus === "APPROVED").length}
          label={t("admin.approved")}
          tone="green"
        />
        <StatCard
          icon={XCircle}
          value={rejectedProfiles.length}
          label={t("admin.rejectedTab")}
          tone="red"
        />
      </div>

      <Tabs defaultValue="members">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start gap-2 md:w-auto">
          <TabsTrigger value="members">
            {t("admin.allMembers")} ({allMembers.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t("admin.pending")} ({pendingProfiles.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            {t("admin.rejectedTab")} ({rejectedProfiles.length})
          </TabsTrigger>
          <TabsTrigger value="contacts">
            {t("admin.contactRequests")} ({contactRequests.length})
          </TabsTrigger>
          <TabsTrigger value="public">
            <LayoutGrid className="mr-1 h-4 w-4" /> {t("admin.publicTab")}
          </TabsTrigger>
          <TabsTrigger value="plans">
            <CreditCard className="mr-1 h-4 w-4" /> {t("sub.tab")}
          </TabsTrigger>
        </TabsList>

        {/* All Members */}
        <TabsContent value="members">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("admin.searchMembers")}
                  className="pl-9"
                />
              </div>
              {query && (
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  <RotateCcw className="mr-1 h-4 w-4" /> {t("profiles.reset")}
                </Button>
              )}
            </div>

            {filteredMembers.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                {query ? t("admin.noSearchResults") : t("admin.noMembers")}
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <MemberTable
                  profiles={filteredMembers}
                  mode="all"
                  onView={setReviewProfile}
                  onDelete={setDeleteTarget}
                />
              </Card>
            )}
          </section>
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("admin.searchPending")}
                  className="pl-9"
                />
              </div>
              {query && (
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  <RotateCcw className="mr-1 h-4 w-4" /> {t("profiles.reset")}
                </Button>
              )}
            </div>

            {filteredPending.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                {query ? t("admin.noSearchResults") : t("admin.noPending")}
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <MemberTable
                  profiles={filteredPending}
                  mode="pending"
                  onView={setReviewProfile}
                />
              </Card>
            )}
          </section>
        </TabsContent>

        {/* Rejected */}
        <TabsContent value="rejected">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("admin.searchRejected")}
                  className="pl-9"
                />
              </div>
              {query && (
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  <RotateCcw className="mr-1 h-4 w-4" /> {t("profiles.reset")}
                </Button>
              )}
            </div>

            {filteredRejected.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                {query ? t("admin.noSearchResults") : t("admin.noRejected")}
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <MemberTable
                  profiles={filteredRejected}
                  mode="rejected"
                  onView={setReviewProfile}
                  onDelete={setDeleteTarget}
                />
              </Card>
            )}
          </section>
        </TabsContent>

        {/* Contact Requests */}
        <TabsContent value="contacts">
          <section>
            <h3 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-maroon">
              <Phone className="h-5 w-5 text-saffron" /> {t("admin.contactRequestsTitle")}
            </h3>
            {contactRequests.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                {t("admin.noContactRequests")}
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-cream/50">
                      <TableHead>{t("admin.requester")}</TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t("admin.requesterPhone")}
                      </TableHead>
                      <TableHead>{t("admin.requestedProfile")}</TableHead>
                      <TableHead className="text-right">{t("admin.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-semibold text-maroon">
                          {r.requesterName}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {r.requesterPhone}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.ownerName}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approveContact(r.id)}
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectContact(r.id)}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.reject")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </section>
        </TabsContent>

        <TabsContent value="public">
          <PublicDisplayPanel />
        </TabsContent>

        <TabsContent value="plans">
          <SubscriptionPlansPanel />
        </TabsContent>
      </Tabs>

      <AdminReviewModal
        profile={reviewProfile}
        open={!!reviewProfile}
        onOpenChange={(o) => !o && setReviewProfile(null)}
        onApprove={approve}
        onReject={reject}
        onDelete={remove}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        targetName={deleteTarget?.username ?? null}
        onConfirm={() => deleteTarget && remove(deleteTarget.userId)}
      />
    </div>
  )
}

function MemberTable({
  profiles,
  mode,
  onView,
  onDelete,
}: {
  profiles: PublicProfile[]
  mode: "all" | "pending" | "rejected"
  onView: (p: PublicProfile) => void
  onDelete?: (p: PublicProfile) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-cream/50">
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">Phone</TableHead>
          <TableHead className="hidden md:table-cell">District</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map((p) => (
          <TableRow key={p.userId}>
            <TableCell className="font-semibold text-maroon">
              <button
                type="button"
                onClick={() => onView(p)}
                className="text-left hover:underline"
              >
                {p.username}
              </button>
            </TableCell>
            <TableCell className="hidden md:table-cell">{p.phone}</TableCell>
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
              {p.district}
            </TableCell>
            <TableCell>
              <StatusBadge status={p.approvalStatus} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => onView(p)}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> View
                </Button>
                {mode !== "pending" && onDelete && (
                  <Button size="sm" variant="destructive" onClick={() => onDelete(p)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    REJECTED: "bg-red-100 text-red-700",
  }
  const label = status === "APPROVED" ? "Approved" : status === "PENDING" ? "Pending" : "Rejected"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        styles[status as keyof typeof styles] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {label}
    </span>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ElementType
  value: number
  label: string
  tone: "amber" | "blue" | "green" | "red"
}) {
  const toneClasses = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
  }

  return (
    <Card className={`flex items-center gap-4 border p-4 ${toneClasses[tone]}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-heading text-2xl font-bold leading-none">{value}</div>
        <div className="text-sm font-medium opacity-90">{label}</div>
      </div>
    </Card>
  )
}
