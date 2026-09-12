import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native"
import { useState, useEffect } from "react"
import { Image } from "expo-image"
import { router } from "expo-router"
import { getPaymentStatus, uploadPaymentScreenshot } from "@/api/profile"
import * as ImagePicker from "expo-image-picker"
import { ApiCallError } from "@/api/client"
import { Colors, Spacing, Radii, FontSize, Shadow } from "@/constants/theme"
import type { PaymentStatus } from "@/types"

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace("/api/v1", "") ?? ""

export default function PaymentStatusScreen() {
  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null)
  const [orderRef, setOrderRef] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)

  async function load() {
    try {
      const p = await getPaymentStatus()
      setPayment(p)
      if (p.orderRef) setOrderRef(p.orderRef)
    } catch { /* silent */ }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function pickAndUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    })
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    setScreenshotUri(asset.uri)
    setUploading(true)
    setMsg(null)

    // We need to get the orderRef first. The /payment/status endpoint doesn't
    // return it directly, so we check the payment order via the admin screenshot
    // endpoint (for self). For simplicity, we prompt the user to enter it
    // or we fetch it from a dedicated endpoint we'll call with auth.
    try {
      if (!orderRef) {
        setMsg({ text: "No active order found. Please contact support.", type: "error" })
        setUploading(false)
        return
      }

      await uploadPaymentScreenshot(asset.uri, asset.mimeType ?? "image/jpeg", orderRef)
      setMsg({ text: "Screenshot uploaded! Admin will review your payment shortly.", type: "success" })
      await load()
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Upload failed.", type: "error" })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.maroon} /></View>
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Status</Text>
        <View style={{ width: 50 }} />
      </View>

      {!payment?.hasOrder ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Payment Record</Text>
          <Text style={styles.cardBody}>
            No payment order found for your account. If you registered without payment, your account is free.
          </Text>
        </View>
      ) : (
        <>
          {/* Status card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Details</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Amount</Text>
              <Text style={styles.rowValue}>₹{payment.amountInr ?? "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Status</Text>
              <PayStatusBadge status={payment.status} />
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Screenshot</Text>
              <Text style={[styles.rowValue, { color: payment.screenshotUploaded ? Colors.success : Colors.amber }]}>
                {payment.screenshotUploaded ? "✓ Uploaded" : "Not uploaded yet"}
              </Text>
            </View>
            {payment.paidAt && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Submitted</Text>
                <Text style={styles.rowValue}>{new Date(payment.paidAt).toLocaleDateString("en-IN")}</Text>
              </View>
            )}
          </View>

          {/* What's happening */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What happens next?</Text>
            <StepRow done={true} label="Order created" />
            <StepRow done={payment.screenshotUploaded} label="Payment screenshot uploaded" />
            <StepRow done={payment.status === "PAID"} label="Admin verifies payment" />
            <StepRow done={false} pending label="Profile approved & visible" />
          </View>

          {/* Re-upload section */}
          {payment.screenshotUploaded && payment.status !== "PAID" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Need to re-upload screenshot?</Text>
              <Text style={styles.cardBody}>
                If your screenshot was unclear or rejected, you can upload a new one.
              </Text>
              {msg && (
                <View style={[styles.msgBox, msg.type === "error" ? styles.msgError : styles.msgSuccess]}>
                  <Text style={[styles.msgText, { color: msg.type === "error" ? Colors.error : Colors.green }]}>{msg.text}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.uploadBtn, uploading && styles.btnDisabled]}
                onPress={pickAndUpload}
                disabled={uploading}
              >
                <Text style={styles.uploadBtnText}>{uploading ? "Uploading…" : "Upload New Screenshot"}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!payment.screenshotUploaded && (
            <View style={[styles.card, { borderColor: Colors.saffron, borderWidth: 2 }]}>
              <Text style={styles.cardTitle}>⚠️ Upload Required</Text>
              <Text style={styles.cardBody}>
                Please upload your UPI payment screenshot to complete registration.
                Go back to the QR payment screen or upload it here.
              </Text>
              {msg && (
                <View style={[styles.msgBox, msg.type === "error" ? styles.msgError : styles.msgSuccess]}>
                  <Text style={[styles.msgText, { color: msg.type === "error" ? Colors.error : Colors.green }]}>{msg.text}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.uploadBtn, uploading && styles.btnDisabled]}
                onPress={pickAndUpload}
                disabled={uploading}
              >
                <Text style={styles.uploadBtnText}>{uploading ? "Uploading…" : "Upload Payment Screenshot"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace("/(tabs)/home")}>
        <Text style={styles.homeBtnText}>Go to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function PayStatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pending Review", color: Colors.amber },
    PAID: { label: "✓ Verified", color: Colors.success },
    FAILED: { label: "Failed", color: Colors.error },
    EXPIRED: { label: "Expired", color: Colors.muted },
  }
  const { label, color } = map[status ?? "PENDING"] ?? map.PENDING
  return <Text style={[styles.rowValue, { color, fontWeight: "700" }]}>{label}</Text>
}

function StepRow({ done, pending, label }: { done: boolean; pending?: boolean; label: string }) {
  return (
    <View style={styles.stepRow}>
      <Text style={{ fontSize: 16, marginRight: 8, color: done ? Colors.success : Colors.mutedLight }}>
        {done ? "✓" : "○"}
      </Text>
      <Text style={[styles.stepLabel, done && styles.stepDone]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: Colors.maroon, paddingTop: 56, paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  backBtn: { color: Colors.goldBright, fontWeight: "600", fontSize: FontSize.sm },
  headerTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "800" },
  card: { margin: Spacing.md, backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.maroon, marginBottom: Spacing.sm },
  cardBody: { fontSize: FontSize.sm, color: Colors.muted, lineHeight: 20, marginBottom: Spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.maroon },
  rowValue: { fontSize: FontSize.sm, color: Colors.muted },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  stepLabel: { fontSize: FontSize.sm, color: Colors.muted, flex: 1 },
  stepDone: { color: Colors.success, fontWeight: "600" },
  msgBox: { borderRadius: Radii.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  msgSuccess: { backgroundColor: Colors.greenMuted },
  msgError: { backgroundColor: "#FEE2E2" },
  msgText: { fontSize: FontSize.sm, textAlign: "center" },
  uploadBtn: { backgroundColor: Colors.maroon, borderRadius: Radii.full, paddingVertical: 12, alignItems: "center", marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.sm },
  homeBtn: { marginHorizontal: Spacing.md, backgroundColor: Colors.creamDark, borderRadius: Radii.full, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  homeBtnText: { color: Colors.maroon, fontWeight: "700", fontSize: FontSize.sm },
})
