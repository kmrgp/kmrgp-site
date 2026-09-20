import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native"
import { useState, useEffect, useCallback } from "react"
import { Image } from "expo-image"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { useAuth, signOut } from "@/store/authStore"
import {
  getMyProfile, updateMyProfile, submitProfileForApproval,
  uploadProfilePhoto, uploadCastCertificate,
} from "@/api/profile"
import { ApiCallError } from "@/api/client"
import { Colors, Spacing, Radii, FontSize, Shadow } from "@/constants/theme"
import type { PublicProfile } from "@/types"

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ?? ""

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  return url.startsWith("http") ? url : `${BASE}${url}`
}

// ─── Form state shape (all profile editable fields) ───────────────────────────
interface ProfileForm {
  dob: string
  height: string
  gotraSelf: string
  gotraMother: string
  education: string
  currentEducation: string   // fixed: separate from profession
  profession: string
  companyName: string
  district: string
  community: string
  gender: string
  fatherName: string
  fatherOccupation: string
  motherName: string
  motherOccupation: string
  brothers: string
  sisters: string
  familyType: string
  parentsOccupation: string
  address: string
  contact: string
  guardianMobile: string
  whatsappNumber: string
  hobbies: string
  additionalDetails: string
  bio: string
}

function profileToForm(p: PublicProfile): ProfileForm {
  return {
    dob: p.dob ?? "",
    height: p.height ?? "",
    gotraSelf: p.gotraSelf ?? "",
    gotraMother: p.gotraMother ?? "",
    education: p.education ?? "",
    currentEducation: p.currentEducation ?? "",
    profession: p.profession ?? "",
    companyName: p.companyName ?? "",
    district: p.district ?? "",
    community: p.community ?? "Mewada",
    gender: p.gender ?? "",
    fatherName: p.fatherName ?? "",
    fatherOccupation: p.fatherOccupation ?? "",
    motherName: p.motherName ?? "",
    motherOccupation: p.motherOccupation ?? "",
    brothers: p.brothers ?? "",
    sisters: p.sisters ?? "",
    familyType: p.familyType ?? "",
    parentsOccupation: p.parentsOccupation ?? "",
    address: p.address ?? "",
    contact: p.contact ?? "",
    guardianMobile: p.guardianMobile ?? "",
    whatsappNumber: p.whatsappNumber ?? "",
    hobbies: p.hobbies ?? "",
    additionalDetails: p.additionalDetails ?? "",
    bio: p.bio ?? "",
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingCast, setUploadingCast] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [form, setForm] = useState<ProfileForm>({
    dob: "", height: "", gotraSelf: "", gotraMother: "",
    education: "", currentEducation: "", profession: "", companyName: "",
    district: "", community: "Mewada", gender: "", fatherName: "",
    fatherOccupation: "", motherName: "", motherOccupation: "",
    brothers: "", sisters: "", familyType: "", parentsOccupation: "",
    address: "", contact: "", guardianMobile: "", whatsappNumber: "",
    hobbies: "", additionalDetails: "", bio: "",
  })

  async function load() {
    try {
      const p = await getMyProfile()
      setProfile(p)
      setForm(profileToForm(p))
    } catch { /* silent */ }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  // ── Save bio-data ─────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      await updateMyProfile(form)
      await load()
      setEditing(false)
      setMsg({ text: "Profile updated successfully.", type: "success" })
    } catch (err) {
      setMsg({ text: err instanceof ApiCallError ? err.message : "Save failed.", type: "error" })
    } finally { setSaving(false) }
  }

  // ── Profile photo upload ──────────────────────────────────────────────────
  async function handlePhotoUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your photos.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.IMAGE,
      quality: 0.85, allowsEditing: true, aspect: [1, 1] as [number, number],
    })
    if (result.canceled || !result.assets?.[0]) return

    setUploading(true)
    setMsg(null)
    try {
      const asset = result.assets[0]
      await uploadProfilePhoto(asset.uri, asset.mimeType ?? "image/jpeg")
      await load()
      setMsg({ text: "Profile photo updated.", type: "success" })
    } catch (err) {
      setMsg({ text: err instanceof ApiCallError ? err.message : "Upload failed.", type: "error" })
    } finally { setUploading(false) }
  }

  // ── Cast certificate upload ───────────────────────────────────────────────
  async function handleCastUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your photos.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.IMAGE,
      quality: 0.9,
    })
    if (result.canceled || !result.assets?.[0]) return

    setUploadingCast(true)
    setMsg(null)
    try {
      const asset = result.assets[0]
      await uploadCastCertificate(asset.uri, asset.mimeType ?? "image/jpeg")
      await load()
      setMsg({ text: "Cast certificate uploaded.", type: "success" })
    } catch (err) {
      setMsg({ text: err instanceof ApiCallError ? err.message : "Upload failed.", type: "error" })
    } finally { setUploadingCast(false) }
  }

  // ── Submit for approval ───────────────────────────────────────────────────
  async function handleSubmitForApproval() {
    Alert.alert(
      "Submit for Approval",
      "Are you sure you want to submit your profile for admin verification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit", onPress: async () => {
            setSubmitting(true)
            setMsg(null)
            try {
              await submitProfileForApproval()
              await load()
              setMsg({ text: "Profile submitted! Admin will review within 24 hours.", type: "success" })
            } catch (err) {
              setMsg({ text: err instanceof ApiCallError ? err.message : "Submit failed.", type: "error" })
            } finally { setSubmitting(false) }
          }
        }
      ]
    )
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out", style: "destructive", onPress: async () => {
          await signOut()
          router.replace("/login")
        }
      }
    ])
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.maroon} /></View>
  }

  const imgUrl = resolveImageUrl(profile?.imageUrl ?? null)
  const castUrl = resolveImageUrl(profile?.castCertificateUrl ?? null)
  const canSubmit = profile?.approvalStatus === "SENT" || profile?.approvalStatus === "REJECTED"

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.maroon} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle as object}>My Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText as object}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePhotoUpload} disabled={uploading}>
          <View style={styles.avatarWrap}>
            {imgUrl ? (
              <Image source={{ uri: imgUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarEmoji as object}>👤</Text>
              </View>
            )}
            <View style={styles.avatarEdit}>
              <Text style={styles.avatarEditText as object}>{uploading ? "…" : "✏"}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarName as object}>{user?.username ?? profile?.username ?? "—"}</Text>
        <Text style={styles.avatarPhone as object}>{user?.phone}</Text>
        <StatusBadge status={profile?.approvalStatus ?? "SENT"} />
      </View>

      {/* Message */}
      {msg && (
        <View style={[styles.msgBox, msg.type === "error" ? styles.msgError : styles.msgSuccess]}>
          <Text style={[
            styles.msgText,
            msg.type === "error" ? styles.msgTextError : styles.msgTextSuccess
          ] as object}>{msg.text}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {canSubmit && (
          <TouchableOpacity
            style={[styles.btn, styles.submitBtn]}
            onPress={handleSubmitForApproval}
            disabled={submitting}
          >
            <Text style={styles.btnText as object}>
              {submitting ? "Submitting…" : "Submit for Verification"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btn, editing ? styles.cancelBtn : styles.editBtn]}
          onPress={() => { setEditing(e => !e); setMsg(null) }}
        >
          <Text style={styles.btnText as object}>{editing ? "Cancel" : "Edit Profile"}</Text>
        </TouchableOpacity>
      </View>

      {/* Cast certificate */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle as object}>Cast Certificate</Text>
        {castUrl ? (
          <View style={styles.castRow}>
            <Image source={{ uri: castUrl }} style={styles.castThumb} contentFit="cover" />
            <TouchableOpacity
              style={[styles.btn, styles.editBtn, { flex: 0, paddingHorizontal: 16 }]}
              onPress={handleCastUpload}
              disabled={uploadingCast}
            >
              <Text style={styles.btnText as object}>{uploadingCast ? "…" : "Replace"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadCastBtn}
            onPress={handleCastUpload}
            disabled={uploadingCast}
          >
            <Text style={styles.uploadCastText as object}>
              {uploadingCast ? "Uploading…" : "📎 Upload Cast Certificate"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bio-data card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle as object}>Bio-Data</Text>

        {editing ? (
          <>
            <SectionHeading label="Personal" />
            <EditField label="Date of Birth (YYYY-MM-DD)" value={form.dob}
              onChange={v => setForm(f => ({ ...f, dob: v }))} placeholder="e.g. 1998-05-20"
              keyboardType="numbers-and-punctuation" autoCapitalize="none" />
            <EditField label="Height" value={form.height}
              onChange={v => setForm(f => ({ ...f, height: v }))} placeholder={'e.g. 5\'8"'} />
            <EditField label="Your Gotra" value={form.gotraSelf}
              onChange={v => setForm(f => ({ ...f, gotraSelf: v }))} />
            <EditField label="Mother's Gotra" value={form.gotraMother}
              onChange={v => setForm(f => ({ ...f, gotraMother: v }))} />
            <EditField label="Gender" value={form.gender}
              onChange={v => setForm(f => ({ ...f, gender: v }))} placeholder="Male / Female" />
            <EditField label="Community" value={form.community}
              onChange={v => setForm(f => ({ ...f, community: v }))} />

            <SectionHeading label="Education & Work" />
            <EditField label="Education" value={form.education}
              onChange={v => setForm(f => ({ ...f, education: v }))} placeholder="e.g. Graduate, B.Com" />
            <EditField label="Current Education" value={form.currentEducation}
              onChange={v => setForm(f => ({ ...f, currentEducation: v }))}
              placeholder="e.g. MBA (Pursuing)" />
            <EditField label="Profession" value={form.profession}
              onChange={v => setForm(f => ({ ...f, profession: v }))} placeholder="e.g. Private Job" />
            <EditField label="Company Name" value={form.companyName}
              onChange={v => setForm(f => ({ ...f, companyName: v }))} />

            <SectionHeading label="Family" />
            <EditField label="Father's Name" value={form.fatherName}
              onChange={v => setForm(f => ({ ...f, fatherName: v }))} />
            <EditField label="Father's Occupation" value={form.fatherOccupation}
              onChange={v => setForm(f => ({ ...f, fatherOccupation: v }))} />
            <EditField label="Mother's Name" value={form.motherName}
              onChange={v => setForm(f => ({ ...f, motherName: v }))} />
            <EditField label="Mother's Occupation" value={form.motherOccupation}
              onChange={v => setForm(f => ({ ...f, motherOccupation: v }))} />
            <EditField label="Parents' Occupation (combined)" value={form.parentsOccupation}
              onChange={v => setForm(f => ({ ...f, parentsOccupation: v }))} />
            <EditField label="Brothers" value={form.brothers}
              onChange={v => setForm(f => ({ ...f, brothers: v }))} keyboardType="number-pad" autoCapitalize="none" />
            <EditField label="Sisters" value={form.sisters}
              onChange={v => setForm(f => ({ ...f, sisters: v }))} keyboardType="number-pad" autoCapitalize="none" />
            <EditField label="Family Type" value={form.familyType}
              onChange={v => setForm(f => ({ ...f, familyType: v }))} placeholder="Joint Family / Nuclear Family" />
            <EditField label="Address" value={form.address}
              onChange={v => setForm(f => ({ ...f, address: v }))} multiline />

            <SectionHeading label="Contact" />
            <EditField label="Contact Number" value={form.contact}
              onChange={v => setForm(f => ({ ...f, contact: v }))} keyboardType="phone-pad" autoCapitalize="none" />
            <EditField label="Guardian Mobile" value={form.guardianMobile}
              onChange={v => setForm(f => ({ ...f, guardianMobile: v }))} keyboardType="phone-pad" autoCapitalize="none" />
            <EditField label="WhatsApp Number" value={form.whatsappNumber}
              onChange={v => setForm(f => ({ ...f, whatsappNumber: v }))} keyboardType="phone-pad" autoCapitalize="none" />

            <SectionHeading label="Additional" />
            <EditField label="Hobbies" value={form.hobbies}
              onChange={v => setForm(f => ({ ...f, hobbies: v }))} multiline />
            <EditField label="Additional Details" value={form.additionalDetails}
              onChange={v => setForm(f => ({ ...f, additionalDetails: v }))} multiline />
            <EditField label="Bio" value={form.bio}
              onChange={v => setForm(f => ({ ...f, bio: v }))} multiline />

            <TouchableOpacity
              style={[styles.btn, styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.btnText as object}>{saving ? "Saving…" : "Save Changes"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* View mode — show all saved fields */
          <>
            <SectionHeading label="Personal" />
            <InfoRow label="Date of Birth" value={profile?.dob} />
            <InfoRow label="Height" value={profile?.height} />
            <InfoRow label="Gotra (Self)" value={profile?.gotraSelf} />
            <InfoRow label="Gotra (Mother)" value={profile?.gotraMother} />
            <InfoRow label="Gender" value={profile?.gender} />
            <InfoRow label="Community" value={profile?.community} />

            <SectionHeading label="Education & Work" />
            <InfoRow label="Education" value={profile?.education} />
            <InfoRow label="Current Education" value={profile?.currentEducation} />
            <InfoRow label="Profession" value={profile?.profession} />
            <InfoRow label="Company" value={profile?.companyName} />

            <SectionHeading label="Family" />
            <InfoRow label="Father's Name" value={profile?.fatherName} />
            <InfoRow label="Father's Occupation" value={profile?.fatherOccupation} />
            <InfoRow label="Mother's Name" value={profile?.motherName} />
            <InfoRow label="Mother's Occupation" value={profile?.motherOccupation} />
            <InfoRow label="Brothers" value={profile?.brothers} />
            <InfoRow label="Sisters" value={profile?.sisters} />
            <InfoRow label="Family Type" value={profile?.familyType} />
            <InfoRow label="Address" value={profile?.address} />

            <SectionHeading label="Contact" />
            <InfoRow label="Contact Number" value={profile?.contact} />
            <InfoRow label="Guardian Mobile" value={profile?.guardianMobile} />
            <InfoRow label="WhatsApp" value={profile?.whatsappNumber} />

            <SectionHeading label="Additional" />
            <InfoRow label="Hobbies" value={profile?.hobbies} />
            <InfoRow label="Additional Details" value={profile?.additionalDetails} />
            <InfoRow label="Bio" value={profile?.bio} />
          </>
        )}
      </View>
    </ScrollView>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    SENT: { label: "Draft", bg: "#F3F4F6", color: Colors.muted },
    PENDING: { label: "Under Review", bg: "#FEF3C7", color: Colors.amber },
    APPROVED: { label: "✓ Verified", bg: Colors.greenMuted, color: Colors.green },
    REJECTED: { label: "Rejected", bg: "#FEE2E2", color: Colors.error },
  }
  const { label, bg, color } = map[status] ?? map.SENT
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }] as object}>{label}</Text>
    </View>
  )
}

function SectionHeading({ label }: { label: string }) {
  return (
    <Text style={styles.sectionHeading as object}>{label}</Text>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value || value === "-") return null
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel as object}>{label}</Text>
      <Text style={styles.infoValue as object}>{value}</Text>
    </View>
  )
}

function EditField({
  label, value, onChange, placeholder, keyboardType, multiline, autoCapitalize,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  keyboardType?: "default" | "number-pad" | "phone-pad" | "numbers-and-punctuation"
  multiline?: boolean
  autoCapitalize?: "none" | "words" | "sentences" | "characters"
}) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <Text style={styles.editLabel as object}>{label}</Text>
      <TextInput
        style={[styles.editInput, multiline && styles.editInputMulti] as object}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={Colors.mutedLight}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize={autoCapitalize ?? "words"}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: Colors.maroon, paddingTop: 56, paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { color: Colors.white, fontSize: FontSize.xl, fontWeight: "800" },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.full,
  },
  logoutText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: "600" },
  avatarSection: {
    alignItems: "center", backgroundColor: Colors.maroon,
    paddingBottom: Spacing.xl, paddingTop: Spacing.sm,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: Colors.gold,
  },
  avatarPlaceholder: { backgroundColor: Colors.creamDark, justifyContent: "center", alignItems: "center" },
  avatarEmoji: { fontSize: 40 },
  avatarEdit: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: Colors.gold, borderRadius: 12,
    width: 24, height: 24, justifyContent: "center", alignItems: "center",
  },
  avatarEditText: { fontSize: 12, color: Colors.white },
  avatarName: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "700", marginTop: Spacing.sm },
  avatarPhone: { color: Colors.goldBright, fontSize: FontSize.sm, marginTop: 2 },
  badge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radii.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: "700" },
  msgBox: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radii.md, padding: Spacing.sm },
  msgSuccess: { backgroundColor: Colors.greenMuted },
  msgError: { backgroundColor: "#FEE2E2" },
  msgText: { fontSize: FontSize.sm, textAlign: "center" },
  msgTextSuccess: { color: Colors.green, fontWeight: "600" },
  msgTextError: { color: Colors.error, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.md },
  btn: { flex: 1, paddingVertical: 12, borderRadius: Radii.full, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.sm },
  editBtn: { backgroundColor: Colors.maroon },
  cancelBtn: { backgroundColor: Colors.muted },
  submitBtn: { backgroundColor: Colors.saffron },
  saveBtn: { backgroundColor: Colors.success, marginTop: Spacing.md },
  card: {
    margin: Spacing.md, backgroundColor: Colors.white, borderRadius: Radii.lg,
    padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.maroon, marginBottom: Spacing.sm },
  sectionHeading: {
    fontSize: FontSize.xs, fontWeight: "700", color: Colors.muted,
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: Spacing.md, marginBottom: 4, borderBottomWidth: 1,
    borderBottomColor: Colors.border, paddingBottom: 4,
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.maroon, flex: 1 },
  infoValue: { fontSize: FontSize.sm, color: Colors.muted, flex: 1, textAlign: "right" },
  editLabel: { fontSize: FontSize.xs, fontWeight: "600", color: Colors.maroon, marginBottom: 3 },
  editInput: {
    backgroundColor: Colors.creamDark, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radii.sm, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },
  editInputMulti: { minHeight: 72, textAlignVertical: "top" },
  // Cast certificate
  castRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  castThumb: { width: 80, height: 80, borderRadius: Radii.sm, borderWidth: 1, borderColor: Colors.border },
  uploadCastBtn: {
    borderWidth: 2, borderColor: Colors.gold, borderStyle: "dashed",
    borderRadius: Radii.md, padding: Spacing.md, alignItems: "center",
  },
  uploadCastText: { color: Colors.maroon, fontWeight: "600", fontSize: FontSize.sm },
})
