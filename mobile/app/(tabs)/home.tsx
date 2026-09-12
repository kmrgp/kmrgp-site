import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from "react-native"
import { useState, useEffect, useCallback } from "react"
import { router } from "expo-router"
import { useAuth } from "@/store/authStore"
import { getMyProfile, getMyStats } from "@/api/profile"
import { getPaymentStatus } from "@/api/profile"
import { Colors, Spacing, Radii, FontSize, Shadow } from "@/constants/theme"
import type { PublicProfile, DashboardStats, PaymentStatus } from "@/types"

export default function HomeScreen() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const [p, s, pay] = await Promise.all([
        getMyProfile().catch(() => null),
        getMyStats().catch(() => null),
        getPaymentStatus().catch(() => null),
      ])
      setProfile(p)
      setStats(s)
      setPayment(pay)
    } catch { /* silent */ }
  }

  useEffect(() => { load() }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  const approvalStatus = profile?.approvalStatus ?? "SENT"

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.maroon} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerBrand}>ॐ KMRGP</Text>
        <Text style={styles.headerGreeting}>Namaste, {user?.username ?? "Member"}</Text>
        <Text style={styles.headerSub}>Your matrimonial workspace</Text>
      </View>

      {/* Profile status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Profile Status</Text>
        <StatusBadge status={approvalStatus} />
        {approvalStatus === "SENT" && (
          <Text style={styles.statusHint}>Complete your profile and submit for admin verification.</Text>
        )}
        {approvalStatus === "PENDING" && (
          <Text style={styles.statusHint}>Your profile is under review. You'll be notified once approved.</Text>
        )}
        {approvalStatus === "APPROVED" && (
          <Text style={[styles.statusHint, { color: Colors.success }]}>Your profile is live and visible to other members.</Text>
        )}
        {approvalStatus === "REJECTED" && (
          <Text style={[styles.statusHint, { color: Colors.error }]}>Your profile was rejected. Please update and resubmit.</Text>
        )}
      </View>

      {/* Payment status (if pending) */}
      {payment?.hasOrder && payment.status !== "PAID" && (
        <View style={styles.paymentWarning}>
          <Text style={styles.paymentWarningTitle}>⏳ Payment Under Review</Text>
          <Text style={styles.paymentWarningText}>
            {payment.screenshotUploaded
              ? "Your payment screenshot is pending admin verification."
              : "You have a pending payment order. Please upload your payment screenshot."}
          </Text>
          <TouchableOpacity style={styles.paymentBtn} onPress={() => router.push("/payment-status")}>
            <Text style={styles.paymentBtnText}>View Payment Status</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      {stats && (
        <>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Profile Views" value={stats.profileViews} emoji="👁" />
            <StatCard label="Interests Received" value={stats.interestsReceived} emoji="💌" />
            <StatCard label="Accepted Matches" value={stats.acceptedMatches} emoji="💑" />
            <StatCard label="Pending Interests" value={stats.pendingInterests} emoji="⏳" />
          </View>
        </>
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <ActionCard emoji="🔍" label="Find Matches" onPress={() => router.push("/(tabs)/browse")} />
        <ActionCard emoji="👤" label="Edit Profile" onPress={() => router.push("/(tabs)/profile")} />
        <ActionCard emoji="💌" label="Interests" onPress={() => router.push("/(tabs)/interests")} />
        <ActionCard emoji="📋" label="Payment Status" onPress={() => router.push("/payment-status")} />
      </View>
    </ScrollView>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    SENT: { label: "Draft", bg: "#F3F4F6", color: Colors.muted },
    PENDING: { label: "Under Review", bg: "#FEF3C7", color: Colors.amber },
    APPROVED: { label: "Verified & Active", bg: Colors.greenMuted, color: Colors.green },
    REJECTED: { label: "Rejected", bg: "#FEE2E2", color: Colors.error },
  }
  const { label, bg, color } = map[status] ?? map.SENT
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function ActionCard({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingBottom: 40 },
  header: { backgroundColor: Colors.maroon, paddingTop: 60, paddingBottom: 28, paddingHorizontal: Spacing.lg, alignItems: "center" },
  headerBrand: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: "700", letterSpacing: 2, marginBottom: 4 },
  headerGreeting: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: "800" },
  headerSub: { color: Colors.goldBright, fontSize: FontSize.sm, marginTop: 2 },
  statusCard: { margin: Spacing.md, backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  statusTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.maroon, marginBottom: Spacing.sm },
  badge: { alignSelf: "flex-start", paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radii.full, marginBottom: 6 },
  badgeText: { fontSize: FontSize.xs, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  statusHint: { fontSize: FontSize.xs, color: Colors.muted, lineHeight: 16 },
  paymentWarning: { marginHorizontal: Spacing.md, backgroundColor: "#FEF3C7", borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.saffron },
  paymentWarningTitle: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.amber, marginBottom: 4 },
  paymentWarningText: { fontSize: FontSize.xs, color: Colors.amber, lineHeight: 18, marginBottom: Spacing.sm },
  paymentBtn: { backgroundColor: Colors.saffron, borderRadius: Radii.full, paddingVertical: 8, alignItems: "center" },
  paymentBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.xs },
  sectionTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.maroon, marginHorizontal: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: Spacing.md, gap: Spacing.sm },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, alignItems: "center", ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: FontSize.xxl, fontWeight: "800", color: Colors.maroon },
  statLabel: { fontSize: FontSize.xs, color: Colors.muted, textAlign: "center", marginTop: 2 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: Spacing.md, gap: Spacing.sm },
  actionCard: { flex: 1, minWidth: "45%", backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, alignItems: "center", ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.maroon, textAlign: "center" },
})
