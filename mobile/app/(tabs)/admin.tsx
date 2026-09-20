/**
 * Admin tab — visible only to ADMIN and SUPER_ADMIN roles.
 * Provides: pending approvals, all members, approve/reject/delete,
 * payment screenshot review, contact request management.
 */

import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, RefreshControl, ActivityIndicator, Modal,
  Alert, TextInput, Image,
} from "react-native"
import { useState, useEffect, useCallback } from "react"
import { router } from "expo-router"
import { useAuth } from "@/store/authStore"
import { api, ApiCallError } from "@/api/client"
import { Colors, Spacing, Radii, FontSize, Shadow } from "@/constants/theme"
import type { PublicProfile, ContactRequestWithNames } from "@/types"

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchMembers(status: "pending" | "rejected" | "all") {
  return api.get<{ profiles: PublicProfile[] }>(`/admin/members?status=${status}`)
}

async function fetchPaymentScreenshot(userId: number) {
  return api.get<{ screenshotUrl: string | null; orderRef: string | null; amountInr: number | null; status: string | null }>(
    `/admin/payment-screenshot?userId=${userId}`
  )
}

async function approveMember(userId: number, showPublic = true) {
  return api.post<null>("/admin/approve", { userId, showPublic, featureOnHome: false })
}

async function rejectMember(userId: number) {
  return api.post<null>("/admin/reject", { userId })
}

async function deleteMember(userId: number) {
  return api.delete<null>("/admin/delete", { userId })
}

async function fetchContactRequests() {
  return api.get<{ requests: ContactRequestWithNames[] }>("/admin/contact-requests")
}

async function resolveContactRequest(requestId: number, action: "APPROVE" | "REJECT") {
  return api.patch<null>("/admin/contact-requests", { requestId, action })
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminTab = "pending" | "all" | "rejected" | "contacts"

interface PaymentInfo {
  screenshotUrl: string | null
  orderRef: string | null
  amountInr: number | null
  status: string | null
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"

  const [tab, setTab] = useState<AdminTab>("pending")
  const [members, setMembers] = useState<PublicProfile[]>([])
  const [contactRequests, setContactRequests] = useState<ContactRequestWithNames[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null)

  // loadData is defined before hooks so useEffect/useCallback can reference it
  const loadData = useCallback(async (t: AdminTab) => {
    try {
      if (t === "contacts") {
        const data = await fetchContactRequests()
        setContactRequests(data.requests)
      } else {
        const data = await fetchMembers(t)
        setMembers(data.profiles)
      }
    } catch (err) {
      setMsg({ text: err instanceof ApiCallError ? err.message : "Load failed", isError: true })
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    loadData(tab).finally(() => setLoading(false))
  }, [tab, isAdmin, loadData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData(tab)
    setRefreshing(false)
  }, [tab, loadData])

  // ── Guard: only render admin UI if user has the role ──────────────────────
  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.forbidden as object}>🚫 Admin access only</Text>
      </View>
    )
  }

  async function openProfile(profile: PublicProfile) {
    setSelectedProfile(profile)
    setPaymentInfo(null)
    setPaymentLoading(true)
    try {
      const info = await fetchPaymentScreenshot(profile.userId)
      setPaymentInfo(info)
    } catch {
      setPaymentInfo({ screenshotUrl: null, orderRef: null, amountInr: null, status: null })
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleApprove(userId: number, username: string | null) {
    Alert.alert(
      "Approve Member",
      `Approve ${username ?? "this member"}? Their profile will be made publicly visible.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setActionLoading(true)
            try {
              await approveMember(userId, true)
              setMsg({ text: `${username ?? "Member"} approved.`, isError: false })
              setSelectedProfile(null)
              await loadData(tab)
            } catch (err) {
              setMsg({ text: err instanceof ApiCallError ? err.message : "Failed", isError: true })
            } finally { setActionLoading(false) }
          }
        }
      ]
    )
  }

  async function handleReject(userId: number, username: string | null) {
    Alert.alert(
      "Reject Member",
      `Reject ${username ?? "this member"}? They will need to resubmit.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject", style: "destructive",
          onPress: async () => {
            setActionLoading(true)
            try {
              await rejectMember(userId)
              setMsg({ text: `${username ?? "Member"} rejected.`, isError: false })
              setSelectedProfile(null)
              await loadData(tab)
            } catch (err) {
              setMsg({ text: err instanceof ApiCallError ? err.message : "Failed", isError: true })
            } finally { setActionLoading(false) }
          }
        }
      ]
    )
  }

  async function handleDelete(userId: number, username: string | null) {
    Alert.alert(
      "Delete Member",
      `Permanently delete ${username ?? "this member"}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            setActionLoading(true)
            try {
              await deleteMember(userId)
              setMsg({ text: `${username ?? "Member"} deleted.`, isError: false })
              setSelectedProfile(null)
              await loadData(tab)
            } catch (err) {
              setMsg({ text: err instanceof ApiCallError ? err.message : "Failed", isError: true })
            } finally { setActionLoading(false) }
          }
        }
      ]
    )
  }

  async function handleContactAction(requestId: number, action: "APPROVE" | "REJECT") {
    setActionLoading(true)
    try {
      await resolveContactRequest(requestId, action)
      setMsg({ text: `Contact request ${action.toLowerCase()}d.`, isError: false })
      await loadData("contacts")
    } catch (err) {
      setMsg({ text: err instanceof ApiCallError ? err.message : "Failed", isError: true })
    } finally { setActionLoading(false) }
  }

  const filteredMembers = members.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.username?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.district?.toLowerCase().includes(q) ||
      p.gotraSelf?.toLowerCase().includes(q)
    )
  })

  const TABS: { key: AdminTab; label: string; count?: number }[] = [
    { key: "pending", label: "Pending" },
    { key: "all", label: "All" },
    { key: "rejected", label: "Rejected" },
    { key: "contacts", label: "Contacts" },
  ]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle as object}>Admin Controls</Text>
        <Text style={styles.headerSub as object}>
          {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"} · {user?.username}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => { setTab(t.key); setMsg(null) }}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive] as object}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Message */}
      {msg && (
        <View style={[styles.msgBox, msg.isError ? styles.msgError : styles.msgSuccess]}>
          <Text style={styles.msgText as object}>{msg.text}</Text>
        </View>
      )}

      {/* Search (not on contacts tab) */}
      {tab !== "contacts" && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput as object}
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, phone, district, gotra…"
            placeholderTextColor={Colors.mutedLight}
          />
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.maroon} /></View>
      ) : tab === "contacts" ? (
        <ContactRequestsList
          requests={contactRequests}
          onApprove={id => handleContactAction(id, "APPROVE")}
          onReject={id => handleContactAction(id, "REJECT")}
          actionLoading={actionLoading}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={p => String(p.userId)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.maroon} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText as object}>
                {tab === "pending" ? "No pending requests." : tab === "rejected" ? "No rejected members." : "No members found."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MemberRow
              profile={item}
              onPress={() => openProfile(item)}
              onApprove={() => handleApprove(item.userId, item.username)}
              onReject={() => handleReject(item.userId, item.username)}
              onDelete={() => handleDelete(item.userId, item.username)}
              tab={tab}
            />
          )}
        />
      )}

      {/* Profile detail modal */}
      {selectedProfile && (
        <ProfileReviewModal
          profile={selectedProfile}
          paymentInfo={paymentInfo}
          paymentLoading={paymentLoading}
          actionLoading={actionLoading}
          onClose={() => { setSelectedProfile(null); setPaymentInfo(null) }}
          onApprove={() => handleApprove(selectedProfile.userId, selectedProfile.username)}
          onReject={() => handleReject(selectedProfile.userId, selectedProfile.username)}
          onDelete={() => handleDelete(selectedProfile.userId, selectedProfile.username)}
          tab={tab}
        />
      )}
    </View>
  )
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ profile, onPress, onApprove, onReject, onDelete, tab }: {
  profile: PublicProfile
  onPress: () => void
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
  tab: AdminTab
}) {
  const statusColor =
    profile.approvalStatus === "APPROVED" ? Colors.success :
    profile.approvalStatus === "PENDING" ? Colors.amber :
    profile.approvalStatus === "REJECTED" ? Colors.error : Colors.muted

  return (
    <TouchableOpacity style={styles.memberRow} onPress={onPress}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName as object} numberOfLines={1}>
          {profile.username ?? "—"}
        </Text>
        <Text style={styles.memberSub as object}>
          {profile.phone ?? "—"} · {profile.district ?? "—"}
        </Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]}>
          <Text style={styles.statusDotText as object}>{profile.approvalStatus}</Text>
        </View>
      </View>
      <View style={styles.memberActions}>
        {(tab === "pending" || profile.approvalStatus === "SENT" || profile.approvalStatus === "PENDING") && (
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={onApprove}>
            <Text style={styles.actionBtnText as object}>✓</Text>
          </TouchableOpacity>
        )}
        {(tab === "pending" || tab === "all") && profile.approvalStatus !== "REJECTED" && (
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={onReject}>
            <Text style={styles.actionBtnText as object}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Text style={styles.actionBtnText as object}>🗑</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

// ─── Profile Review Modal ─────────────────────────────────────────────────────

function ProfileReviewModal({ profile, paymentInfo, paymentLoading, actionLoading, onClose, onApprove, onReject, onDelete, tab }: {
  profile: PublicProfile
  paymentInfo: PaymentInfo | null
  paymentLoading: boolean
  actionLoading: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
  tab: AdminTab
}) {
  const [screenshotOpen, setScreenshotOpen] = useState(false)
  const BASE = process.env.EXPO_PUBLIC_API_URL?.replace("/api/v1", "") ?? ""

  function resolveUrl(url: string | null): string | null {
    if (!url) return null
    return url.startsWith("http") ? url : `${BASE}${url}`
  }

  const imgUrl = resolveUrl(profile.imageUrl)
  const screenshotUrl = resolveUrl(paymentInfo?.screenshotUrl ?? null)

  const canApprove = profile.approvalStatus === "SENT" || profile.approvalStatus === "PENDING"
  const canReject = profile.approvalStatus !== "REJECTED"

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose as object}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle as object} numberOfLines={1}>
            {profile.username ?? "Profile Review"}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Profile photo */}
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={styles.modalPhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.modalPhoto, styles.modalPhotoPlaceholder]}>
              <Text style={{ fontSize: 48 }}>👤</Text>
            </View>
          )}

          {/* Status badge */}
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusBadge, {
              backgroundColor:
                profile.approvalStatus === "APPROVED" ? Colors.greenMuted :
                profile.approvalStatus === "PENDING" ? "#FEF3C7" :
                profile.approvalStatus === "REJECTED" ? "#FEE2E2" : "#F3F4F6"
            }]}>
              <Text style={[styles.statusBadgeText, {
                color:
                  profile.approvalStatus === "APPROVED" ? Colors.success :
                  profile.approvalStatus === "PENDING" ? Colors.amber :
                  profile.approvalStatus === "REJECTED" ? Colors.error : Colors.muted
              }] as object}>{profile.approvalStatus}</Text>
            </View>
            <Text style={styles.profileType as object}>{profile.type}</Text>
          </View>

          {/* Bio details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle as object}>Member Details</Text>
            <DetailRow label="Phone" value={profile.phone} />
            <DetailRow label="DOB" value={profile.dob} />
            <DetailRow label="Height" value={profile.height} />
            <DetailRow label="Gotra (Self)" value={profile.gotraSelf} />
            <DetailRow label="Gotra (Mother)" value={profile.gotraMother} />
            <DetailRow label="Education" value={profile.education} />
            <DetailRow label="Profession" value={profile.profession} />
            <DetailRow label="District" value={profile.district} />
            <DetailRow label="Community" value={profile.community} />
            <DetailRow label="Father's Name" value={profile.fatherName} />
            <DetailRow label="Mother's Name" value={profile.motherName} />
            <DetailRow label="Family Type" value={profile.familyType} />
            <DetailRow label="Brothers" value={profile.brothers} />
            <DetailRow label="Sisters" value={profile.sisters} />
            <DetailRow label="Address" value={profile.address} />
          </View>

          {/* Payment screenshot */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle as object}>Payment Screenshot</Text>
            {paymentLoading ? (
              <ActivityIndicator color={Colors.maroon} style={{ marginVertical: 12 }} />
            ) : paymentInfo?.screenshotUrl ? (
              <>
                <View style={styles.paymentMeta}>
                  <Text style={styles.paymentAmount as object}>
                    ₹{paymentInfo.amountInr ?? "—"} · {paymentInfo.status}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setScreenshotOpen(true)}>
                  <Image
                    source={{ uri: screenshotUrl! }}
                    style={styles.screenshotThumb}
                    resizeMode="cover"
                  />
                  <Text style={styles.screenshotHint as object}>Tap to view full size</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noScreenshot as object}>No payment screenshot uploaded.</Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.modalActions}>
            {canApprove && (
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalApproveBtn, actionLoading && styles.btnDisabled]}
                onPress={onApprove}
                disabled={actionLoading}
              >
                <Text style={styles.modalActionText as object}>✓ Approve</Text>
              </TouchableOpacity>
            )}
            {canReject && (
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalRejectBtn, actionLoading && styles.btnDisabled]}
                onPress={onReject}
                disabled={actionLoading}
              >
                <Text style={styles.modalActionText as object}>✕ Reject</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalActionBtn, styles.modalDeleteBtn, actionLoading && styles.btnDisabled]}
              onPress={onDelete}
              disabled={actionLoading}
            >
              <Text style={styles.modalActionText as object}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Screenshot lightbox */}
      {screenshotOpen && screenshotUrl && (
        <Modal visible animationType="fade" onRequestClose={() => setScreenshotOpen(false)}>
          <TouchableOpacity
            style={styles.lightbox}
            onPress={() => setScreenshotOpen(false)}
            activeOpacity={1}
          >
            <Image source={{ uri: screenshotUrl }} style={styles.lightboxImage} resizeMode="contain" />
            <Text style={styles.lightboxClose as object}>✕  Tap anywhere to close</Text>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  )
}

// ─── Contact Requests List ────────────────────────────────────────────────────

function ContactRequestsList({ requests, onApprove, onReject, actionLoading, refreshing, onRefresh }: {
  requests: ContactRequestWithNames[]
  onApprove: (id: number) => void
  onReject: (id: number) => void
  actionLoading: boolean
  refreshing: boolean
  onRefresh: () => void
}) {
  return (
    <FlatList
      data={requests}
      keyExtractor={r => String(r.id)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.maroon} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText as object}>No pending contact requests.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName as object}>
              {item.requesterName ?? "—"} → {item.ownerName ?? "—"}
            </Text>
            <Text style={styles.contactSub as object}>
              {item.requesterPhone ?? "—"} wants contact with {item.ownerPhone ?? "—"}
            </Text>
            <Text style={styles.contactDate as object}>
              {new Date(item.createdAt).toLocaleDateString("en-IN")}
            </Text>
          </View>
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn, actionLoading && styles.btnDisabled]}
              onPress={() => onApprove(item.id)}
              disabled={actionLoading}
            >
              <Text style={styles.actionBtnText as object}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, actionLoading && styles.btnDisabled]}
              onPress={() => onReject(item.id)}
              disabled={actionLoading}
            >
              <Text style={styles.actionBtnText as object}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  )
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || value === "-") return null
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel as object}>{label}</Text>
      <Text style={styles.detailValue as object}>{value}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  forbidden: { fontSize: FontSize.lg, color: Colors.error, fontWeight: "700" },
  header: {
    backgroundColor: Colors.maroon, paddingTop: 56, paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTitle: { color: Colors.white, fontSize: FontSize.xl, fontWeight: "800" },
  headerSub: { color: Colors.goldBright, fontSize: FontSize.xs, marginTop: 2 },
  tabRow: {
    flexDirection: "row", backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.maroon },
  tabText: { fontSize: FontSize.xs, fontWeight: "600", color: Colors.muted },
  tabTextActive: { color: Colors.maroon },
  msgBox: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radii.sm, padding: Spacing.sm },
  msgSuccess: { backgroundColor: Colors.greenMuted },
  msgError: { backgroundColor: "#FEE2E2" },
  msgText: { fontSize: FontSize.sm, textAlign: "center", fontWeight: "600" },
  searchWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4 },
  searchInput: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radii.md, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },
  list: { padding: Spacing.sm, paddingBottom: 40 },
  emptyText: { color: Colors.muted, fontSize: FontSize.sm, textAlign: "center" },
  // Member row
  memberRow: {
    backgroundColor: Colors.white, borderRadius: Radii.md, padding: Spacing.md,
    marginBottom: Spacing.sm, flexDirection: "row", alignItems: "center",
    ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.maroon },
  memberSub: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  statusDot: {
    alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: Radii.full,
  },
  statusDotText: { fontSize: 10, fontWeight: "700", color: Colors.white, textTransform: "uppercase" },
  memberActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  approveBtn: { backgroundColor: Colors.success },
  rejectBtn: { backgroundColor: Colors.error },
  deleteBtn: { backgroundColor: Colors.muted },
  actionBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.white },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: Spacing.md, paddingTop: 54, backgroundColor: Colors.maroon,
  },
  modalClose: { color: Colors.goldBright, fontSize: FontSize.sm },
  modalTitle: { color: Colors.white, fontSize: FontSize.md, fontWeight: "700", flex: 1, textAlign: "center" },
  modalBody: { padding: Spacing.md, paddingBottom: 60 },
  modalPhoto: { width: "100%", height: 220, borderRadius: Radii.lg, marginBottom: Spacing.md },
  modalPhotoPlaceholder: { backgroundColor: Colors.creamDark, alignItems: "center", justifyContent: "center" },
  statusBadgeRow: { flexDirection: "row", gap: 8, marginBottom: Spacing.md },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radii.full },
  statusBadgeText: { fontSize: FontSize.xs, fontWeight: "700", textTransform: "uppercase" },
  profileType: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.muted, alignSelf: "center" },
  detailsCard: {
    backgroundColor: Colors.creamDark, borderRadius: Radii.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  detailsTitle: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.maroon, marginBottom: Spacing.sm },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  detailLabel: { fontSize: FontSize.xs, fontWeight: "600", color: Colors.maroon, flex: 1 },
  detailValue: { fontSize: FontSize.xs, color: Colors.muted, flex: 1, textAlign: "right" },
  paymentMeta: { marginBottom: Spacing.sm },
  paymentAmount: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.amber },
  screenshotThumb: { width: "100%", height: 160, borderRadius: Radii.md, marginBottom: 4 },
  screenshotHint: { fontSize: FontSize.xs, color: Colors.blue, textAlign: "center" },
  noScreenshot: { fontSize: FontSize.sm, color: Colors.muted, textAlign: "center", padding: Spacing.sm },
  modalActions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.sm },
  modalActionBtn: { flex: 1, minWidth: "30%", paddingVertical: 12, borderRadius: Radii.full, alignItems: "center" },
  modalApproveBtn: { backgroundColor: Colors.success },
  modalRejectBtn: { backgroundColor: Colors.error },
  modalDeleteBtn: { backgroundColor: Colors.muted },
  modalActionText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.sm },
  // Contact requests
  contactCard: {
    backgroundColor: Colors.white, borderRadius: Radii.md, padding: Spacing.md,
    marginBottom: Spacing.sm, flexDirection: "row", alignItems: "center",
    ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.maroon },
  contactSub: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  contactDate: { fontSize: FontSize.xs, color: Colors.mutedLight, marginTop: 2 },
  contactActions: { flexDirection: "row", gap: 6 },
  // Lightbox
  lightbox: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center", alignItems: "center",
  },
  lightboxImage: { width: "95%", height: "80%" },
  lightboxClose: { color: Colors.white, marginTop: 16, fontSize: FontSize.sm, opacity: 0.7 },
})
