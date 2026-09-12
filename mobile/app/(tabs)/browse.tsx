import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal, ScrollView,
} from "react-native"
import { useState, useEffect, useCallback } from "react"
import { Image } from "expo-image"
import { searchProfiles, getProfile } from "@/api/profile"
import { sendInterest } from "@/api/interests"
import { requestContact, getContactStatus } from "@/api/contact"
import { ApiCallError } from "@/api/client"
import { Colors, Spacing, Radii, FontSize, Shadow } from "@/constants/theme"
import type { PublicProfile } from "@/types"

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace("/api/v1", "") ?? ""

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${BASE}${url}`
}

export default function BrowseScreen() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  const [genderFilter, setGenderFilter] = useState<"all" | "groom" | "bride">("all")
  const [keyword, setKeyword] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null)

  async function loadProfiles(p = 1, replace = true) {
    try {
      const result = await searchProfiles({ page: p, pageSize: 9, gender: genderFilter, keyword: keyword || undefined })
      setProfiles(prev => replace ? result.profiles : [...prev, ...result.profiles])
      setTotalPages(result.totalPages)
      setPage(p)
    } catch { /* silent */ }
  }

  useEffect(() => { loadProfiles(1, true).finally(() => setLoading(false)) }, [genderFilter])

  function handleSearch() { setLoading(true); loadProfiles(1, true).finally(() => setLoading(false)) }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadProfiles(1, true)
    setRefreshing(false)
  }, [genderFilter, keyword])

  async function loadMore() {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    await loadProfiles(page + 1, false)
    setLoadingMore(false)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Matches</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Search education, profession…"
            placeholderTextColor={Colors.mutedLight}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          {(["all", "groom", "bride"] as const).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.filterChip, genderFilter === g && styles.filterChipActive]}
              onPress={() => setGenderFilter(g)}
            >
              <Text style={[styles.filterChipText, genderFilter === g && styles.filterChipTextActive]}>
                {g === "all" ? "All" : g === "groom" ? "Groom" : "Bride"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.maroon} />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={p => String(p.userId)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.maroon} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No profiles found. Try adjusting filters.</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.maroon} style={{ padding: 16 }} /> : null}
          renderItem={({ item }) => (
            <ProfileCard
              profile={item}
              onPress={() => setSelectedProfile(item)}
            />
          )}
        />
      )}

      {selectedProfile && (
        <ProfileDetailModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </View>
  )
}

function ProfileCard({ profile, onPress }: { profile: PublicProfile; onPress: () => void }) {
  const imgUrl = resolveImageUrl(profile.imageUrl)
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardImage}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{profile.type === "GROOM" ? "Var" : "Vadhu"}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{profile.username ?? "—"}</Text>
        <Text style={styles.cardDetail}>{profile.age ? `${profile.age} yrs` : ""} {profile.height ? `· ${profile.height}` : ""}</Text>
        <Text style={styles.cardDetail} numberOfLines={1}>{profile.district ?? ""}</Text>
        <Text style={styles.cardDetail} numberOfLines={1}>{profile.education ?? ""}</Text>
      </View>
    </TouchableOpacity>
  )
}

function ProfileDetailModal({ profile, onClose }: { profile: PublicProfile; onClose: () => void }) {
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState("")
  const imgUrl = resolveImageUrl(profile.imageUrl)

  async function handleSendInterest() {
    setSending(true)
    try {
      const r = await sendInterest(profile.userId)
      setMsg(r.alreadySent ? "Interest already sent." : "Interest sent successfully!")
    } catch (err) {
      setMsg(err instanceof ApiCallError ? err.message : "Failed to send interest.")
    } finally { setSending(false) }
  }

  async function handleContact() {
    setSending(true)
    try {
      await requestContact(profile.userId)
      setMsg("Contact request sent. Admin will review shortly.")
    } catch (err) {
      setMsg(err instanceof ApiCallError ? err.message : "Failed to send contact request.")
    } finally { setSending(false) }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕ Close</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>{profile.username ?? "Profile"}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={styles.modalAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.modalAvatar, styles.avatarPlaceholder]}>
              <Text style={{ fontSize: 60 }}>👤</Text>
            </View>
          )}

          <View style={styles.badgeRow}>
            <Chip label={profile.type === "GROOM" ? "Groom" : "Bride"} color={Colors.saffron} />
            {profile.community ? <Chip label={profile.community} color={Colors.maroon} /> : null}
            {profile.approvalStatus === "APPROVED" ? <Chip label="✓ Verified" color={Colors.success} /> : null}
          </View>

          <InfoRow label="Age / Height" value={`${profile.age ?? "—"} yrs, ${profile.height ?? "—"}`} />
          <InfoRow label="Education" value={profile.education} />
          <InfoRow label="Profession" value={profile.profession} />
          <InfoRow label="District" value={profile.district} />
          <InfoRow label="Gotra (Self)" value={profile.gotraSelf} />
          <InfoRow label="Gotra (Mother)" value={profile.gotraMother} />
          <InfoRow label="Father's Name" value={profile.fatherName} />
          <InfoRow label="Mother's Name" value={profile.motherName} />
          <InfoRow label="Family Type" value={profile.familyType} />
          <InfoRow label="Brothers" value={profile.brothers} />
          <InfoRow label="Sisters" value={profile.sisters} />
          <InfoRow label="Address" value={profile.address} />

          {msg ? (
            <View style={styles.msgBox}><Text style={styles.msgText}>{msg}</Text></View>
          ) : null}

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.interestBtn]} onPress={handleSendInterest} disabled={sending}>
              <Text style={styles.actionBtnText}>💌 Send Interest</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.contactBtn]} onPress={handleContact} disabled={sending}>
              <Text style={styles.actionBtnText}>📞 Request Contact</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || value === "-" || value === "—") return null
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { backgroundColor: Colors.maroon, paddingTop: 56, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  headerTitle: { color: Colors.white, fontSize: FontSize.xl, fontWeight: "800", marginBottom: Spacing.sm },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: Spacing.sm },
  searchInput: { flex: 1, backgroundColor: Colors.white, borderRadius: Radii.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.text },
  searchBtn: { backgroundColor: Colors.gold, borderRadius: Radii.md, paddingHorizontal: 16, justifyContent: "center" },
  searchBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.sm },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.full, backgroundColor: "rgba(255,255,255,0.2)" },
  filterChipActive: { backgroundColor: Colors.white },
  filterChipText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: "600" },
  filterChipTextActive: { color: Colors.maroon },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  emptyText: { color: Colors.muted, fontSize: FontSize.sm, textAlign: "center" },
  grid: { padding: Spacing.sm, paddingBottom: 40 },
  row: { gap: Spacing.sm, justifyContent: "space-between" },
  card: { flex: 1, backgroundColor: Colors.white, borderRadius: Radii.lg, overflow: "hidden", ...Shadow.sm, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  cardImage: { position: "relative" },
  avatar: { width: "100%", aspectRatio: 1 },
  avatarPlaceholder: { backgroundColor: Colors.creamDark, justifyContent: "center", alignItems: "center" },
  avatarEmoji: { fontSize: 40 },
  typeBadge: { position: "absolute", top: 6, left: 6, backgroundColor: Colors.saffron, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { color: Colors.white, fontSize: 10, fontWeight: "700" },
  cardBody: { padding: 8 },
  cardName: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.maroon },
  cardDetail: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  modalContainer: { flex: 1, backgroundColor: Colors.white },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.md, paddingTop: 54, backgroundColor: Colors.maroon },
  modalClose: { color: Colors.goldBright, fontSize: FontSize.sm },
  modalTitle: { color: Colors.white, fontSize: FontSize.md, fontWeight: "700", flex: 1, textAlign: "center" },
  modalBody: { padding: Spacing.md, paddingBottom: 60 },
  modalAvatar: { width: "100%", height: 260, borderRadius: Radii.lg, marginBottom: Spacing.md },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radii.full },
  chipText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: "700" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.maroon, flex: 1 },
  infoValue: { fontSize: FontSize.sm, color: Colors.muted, flex: 1, textAlign: "right" },
  msgBox: { backgroundColor: Colors.greenMuted, borderRadius: Radii.md, padding: Spacing.sm, marginVertical: Spacing.sm },
  msgText: { color: Colors.green, fontSize: FontSize.sm, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: Radii.full, alignItems: "center" },
  interestBtn: { backgroundColor: Colors.maroon },
  contactBtn: { backgroundColor: Colors.saffron },
  actionBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.sm },
})
