import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking,
} from "react-native"
import { useState, useEffect, useCallback } from "react"
import { Image } from "expo-image"
import {
  getReceivedInterests, getSentInterests,
  getAcceptedInterests, respondToInterest,
} from "@/api/interests"
import { getContactStatus } from "@/api/contact"
import { ApiCallError } from "@/api/client"
import { Colors, Spacing, Radii, FontSize, Shadow } from "@/constants/theme"
import type { InterestWithProfile } from "@/types"

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ?? ""

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  return url.startsWith("http") ? url : `${BASE}${url}`
}

type Tab = "received" | "sent" | "accepted"

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InterestsScreen() {
  const [tab, setTab] = useState<Tab>("received")
  const [received, setReceived] = useState<InterestWithProfile[]>([])
  const [sent, setSent] = useState<InterestWithProfile[]>([])
  const [accepted, setAccepted] = useState<{
    received: InterestWithProfile[]
    sent: InterestWithProfile[]
  }>({ received: [], sent: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    try {
      const [r, s, a] = await Promise.all([
        getReceivedInterests(),
        getSentInterests(),
        getAcceptedInterests(),
      ])
      setReceived(r.interests)
      setSent(s.interests)
      setAccepted(a)
    } catch { /* silent */ }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  // Clear stale message when switching tabs
  const handleTabChange = (t: Tab) => {
    setTab(t)
    setMsg(null)
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  async function handleRespond(interestId: number, action: "ACCEPTED" | "DECLINED") {
    setActionId(interestId)
    setMsg(null)
    try {
      await respondToInterest(interestId, action)
      setMsg(action === "ACCEPTED" ? "Interest accepted! 🎉" : "Interest declined.")
      await load()
    } catch (err) {
      setMsg(err instanceof ApiCallError ? err.message : "Action failed.")
    } finally { setActionId(null) }
  }

  const currentData: InterestWithProfile[] =
    tab === "received" ? received :
    tab === "sent" ? sent :
    [...accepted.received, ...accepted.sent]

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "received", label: "Received", count: received.length },
    { key: "sent", label: "Sent", count: sent.length },
    {
      key: "accepted", label: "Accepted",
      count: accepted.received.length + accepted.sent.length,
    },
  ]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle as object}>Interests</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => handleTabChange(t.key)}
          >
            <Text style={[
              styles.tabText,
              tab === t.key && styles.tabTextActive,
            ] as object}>
              {t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feedback message */}
      {msg && (
        <View style={styles.msgBox}>
          <Text style={styles.msgText as object}>{msg}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.maroon} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={item => `${item.id}-${tab}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.maroon} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText as object}>
                {tab === "received" ? "No interests received yet." :
                 tab === "sent" ? "You haven't sent any interests." :
                 "No accepted matches yet."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <InterestCard
              item={item}
              tab={tab}
              onAccept={() => handleRespond(item.id, "ACCEPTED")}
              onDecline={() => handleRespond(item.id, "DECLINED")}
              busy={actionId === item.id}
            />
          )}
        />
      )}
    </View>
  )
}

// ─── Interest Card ────────────────────────────────────────────────────────────

function InterestCard({
  item, tab, onAccept, onDecline, busy,
}: {
  item: InterestWithProfile
  tab: Tab
  onAccept: () => void
  onDecline: () => void
  busy: boolean
}) {
  const imgUrl = resolveImageUrl(item.imageUrl)

  // For accepted interests, load the approved contact number
  const [contactNumber, setContactNumber] = useState<string | null>(item.contact ?? null)
  const [contactLoading, setContactLoading] = useState(false)

  useEffect(() => {
    if (tab !== "accepted") return
    // item.contact may already carry the number if the server returned it
    if (item.contact) {
      setContactNumber(item.contact)
      return
    }
    // Otherwise fetch from the contact-status endpoint
    const otherUserId = item.senderId // for accepted-received, the sender is the other party
    if (!otherUserId) return
    setContactLoading(true)
    getContactStatus(otherUserId)
      .then(res => {
        if (res.status === "APPROVED" && res.contact) {
          setContactNumber(res.contact)
        }
      })
      .catch(() => { /* non-blocking */ })
      .finally(() => setContactLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, item.id])

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        {/* Avatar */}
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ fontSize: 22 } as object}>👤</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName as object}>{item.name ?? "Unknown"}</Text>
          <Text style={styles.cardDetail as object}>
            {[
              item.age ? `${item.age} yrs` : null,
              item.type,
              item.district,
            ].filter(Boolean).join(" · ")}
          </Text>
          {item.gotraSelf && (
            <Text style={styles.cardDetail as object}>Gotra: {item.gotraSelf}</Text>
          )}
          {item.gotraMother && (
            <Text style={styles.cardDetail as object}>Mother's Gotra: {item.gotraMother}</Text>
          )}
          {/* Status badge */}
          <View style={[styles.statusBadge, statusBadgeStyle(item.status)]}>
            <Text style={styles.statusText as object}>{item.status}</Text>
          </View>
        </View>
      </View>

      {/* Actions for received PENDING */}
      {tab === "received" && item.status === "PENDING" && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn, busy && styles.btnDisabled]}
            onPress={onAccept}
            disabled={busy}
          >
            <Text style={styles.actionBtnText as object}>✓ Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn, busy && styles.btnDisabled]}
            onPress={onDecline}
            disabled={busy}
          >
            <Text style={styles.actionBtnText as object}>✕ Decline</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contact number for accepted matches */}
      {tab === "accepted" && (
        <View style={styles.contactSection}>
          {contactLoading ? (
            <ActivityIndicator size="small" color={Colors.maroon} />
          ) : contactNumber ? (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:+91${contactNumber.replace(/\D/g, "")}`)}
            >
              <Text style={styles.callBtnText as object}>📞 Call: +91 {contactNumber}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.contactHint as object}>
              📋 Contact pending admin approval.
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeStyle(status: string) {
  if (status === "ACCEPTED") return { backgroundColor: Colors.greenMuted }
  if (status === "DECLINED") return { backgroundColor: "#FEE2E2" }
  return { backgroundColor: "#FEF3C7" }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    backgroundColor: Colors.maroon,
    paddingTop: 56, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
  },
  headerTitle: { color: Colors.white, fontSize: FontSize.xl, fontWeight: "800" },
  tabRow: {
    flexDirection: "row", backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.maroon },
  tabText: { fontSize: FontSize.xs, fontWeight: "600", color: Colors.muted },
  tabTextActive: { color: Colors.maroon },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  emptyText: { color: Colors.muted, fontSize: FontSize.sm, textAlign: "center" },
  msgBox: {
    backgroundColor: Colors.greenMuted,
    margin: Spacing.sm, borderRadius: Radii.sm, padding: Spacing.sm,
  },
  msgText: { color: Colors.green, fontSize: FontSize.sm, textAlign: "center", fontWeight: "600" },
  list: { padding: Spacing.sm, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
  },
  cardRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start" },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: Colors.gold },
  avatarPlaceholder: { backgroundColor: Colors.creamDark, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.maroon },
  cardDetail: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 1 },
  statusBadge: {
    alignSelf: "flex-start", marginTop: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full,
  },
  statusText: { fontSize: 10, fontWeight: "700", color: Colors.maroon },
  actionRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: Radii.full, alignItems: "center" },
  acceptBtn: { backgroundColor: Colors.success },
  declineBtn: { backgroundColor: Colors.error },
  actionBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.xs },
  btnDisabled: { opacity: 0.5 },
  // Contact section
  contactSection: {
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
    alignItems: "center",
  },
  callBtn: {
    backgroundColor: Colors.success, borderRadius: Radii.full,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  callBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.sm },
  contactHint: { fontSize: FontSize.xs, color: Colors.muted, textAlign: "center" },
})
