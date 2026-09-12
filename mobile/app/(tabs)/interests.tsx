import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native"
import { useState, useEffect, useCallback } from "react"
import { Image } from "expo-image"
import {
  getReceivedInterests, getSentInterests, getAcceptedInterests, respondToInterest,
} from "@/api/interests"
import { ApiCallError } from "@/api/client"
import { Colors, Spacing, Radii, FontSize, Shadow } from "@/constants/theme"
import type { InterestWithProfile } from "@/types"

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace("/api/v1", "") ?? ""

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  return url.startsWith("http") ? url : `${BASE}${url}`
}

type Tab = "received" | "sent" | "accepted"

export default function InterestsScreen() {
  const [tab, setTab] = useState<Tab>("received")
  const [received, setReceived] = useState<InterestWithProfile[]>([])
  const [sent, setSent] = useState<InterestWithProfile[]>([])
  const [accepted, setAccepted] = useState<{ received: InterestWithProfile[]; sent: InterestWithProfile[] }>({ received: [], sent: [] })
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

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

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
      setMsg(action === "ACCEPTED" ? "Interest accepted!" : "Interest declined.")
      await load()
    } catch (err) {
      setMsg(err instanceof ApiCallError ? err.message : "Action failed.")
    } finally { setActionId(null) }
  }

  const currentData: InterestWithProfile[] =
    tab === "received" ? received :
    tab === "sent" ? sent :
    [...accepted.received, ...accepted.sent]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Interests</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["received", "sent", "accepted"] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "received" ? `Received (${received.length})` :
               t === "sent" ? `Sent (${sent.length})` :
               `Accepted (${accepted.received.length + accepted.sent.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {msg && (
        <View style={styles.msgBox}>
          <Text style={styles.msgText}>{msg}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.maroon} /></View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={item => `${item.id}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.maroon} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
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

function InterestCard({ item, tab, onAccept, onDecline, busy }: {
  item: InterestWithProfile
  tab: Tab
  onAccept: () => void
  onDecline: () => void
  busy: boolean
}) {
  const imgUrl = resolveImageUrl(item.imageUrl)
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ fontSize: 22 }}>👤</Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name ?? "Unknown"}</Text>
          <Text style={styles.cardDetail}>
            {item.age ? `${item.age} yrs` : ""}
            {item.type ? ` · ${item.type}` : ""}
            {item.district ? ` · ${item.district}` : ""}
          </Text>
          {item.gotraSelf && (
            <Text style={styles.cardDetail}>Gotra: {item.gotraSelf}</Text>
          )}
          <Text style={styles.cardStatus}>
            Status: <Text style={getStatusStyle(item.status)}>{item.status}</Text>
          </Text>
        </View>
      </View>

      {/* Actions only for received + pending */}
      {tab === "received" && item.status === "PENDING" && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn, busy && styles.btnDisabled]}
            onPress={onAccept}
            disabled={busy}
          >
            <Text style={styles.actionBtnText}>✓ Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn, busy && styles.btnDisabled]}
            onPress={onDecline}
            disabled={busy}
          >
            <Text style={styles.actionBtnText}>✕ Decline</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "accepted" && item.contact && (
        <View style={styles.contactBox}>
          <Text style={styles.contactText}>📞 Contact: {item.contact}</Text>
        </View>
      )}
    </View>
  )
}

function getStatusStyle(status: string) {
  if (status === "ACCEPTED") return { color: Colors.success, fontWeight: "700" as const }
  if (status === "DECLINED") return { color: Colors.error, fontWeight: "700" as const }
  return { color: Colors.amber, fontWeight: "700" as const }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { backgroundColor: Colors.maroon, paddingTop: 56, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  headerTitle: { color: Colors.white, fontSize: FontSize.xl, fontWeight: "800" },
  tabRow: { flexDirection: "row", backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.maroon },
  tabText: { fontSize: FontSize.xs, fontWeight: "600", color: Colors.muted },
  tabTextActive: { color: Colors.maroon },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  emptyText: { color: Colors.muted, fontSize: FontSize.sm, textAlign: "center" },
  msgBox: { backgroundColor: Colors.greenMuted, margin: Spacing.sm, borderRadius: Radii.sm, padding: Spacing.sm },
  msgText: { color: Colors.green, fontSize: FontSize.sm, textAlign: "center", fontWeight: "600" },
  list: { padding: Spacing.sm, paddingBottom: 40 },
  card: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  cardRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.gold },
  avatarPlaceholder: { backgroundColor: Colors.creamDark, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.maroon },
  cardDetail: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 1 },
  cardStatus: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 3 },
  actionRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: Radii.full, alignItems: "center" },
  acceptBtn: { backgroundColor: Colors.success },
  declineBtn: { backgroundColor: Colors.error },
  actionBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.xs },
  btnDisabled: { opacity: 0.5 },
  contactBox: { backgroundColor: Colors.greenMuted, borderRadius: Radii.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  contactText: { color: Colors.green, fontSize: FontSize.sm, fontWeight: "600" },
})
