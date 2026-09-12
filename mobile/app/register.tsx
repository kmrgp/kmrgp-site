import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Image,
} from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { getRegistrationPlan, register, createPaymentOrder, completeRegistration } from "@/api/auth"
import { uploadPaymentScreenshot } from "@/api/profile"
import { setSession } from "@/store/authStore"
import { ApiCallError } from "@/api/client"
import { Colors, Spacing, Radii, FontSize } from "@/constants/theme"
import type { RegistrationPlan } from "@/types"

type Step = "form" | "qr"

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>("form")
  const [plan, setPlan] = useState<RegistrationPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [orderRef, setOrderRef] = useState("")

  // Form fields
  const [phone, setPhone] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileType, setProfileType] = useState<"GROOM" | "BRIDE">("GROOM")
  const [gotraSelf, setGotraSelf] = useState("")
  const [gotraMother, setGotraMother] = useState("")
  const [dob, setDob] = useState("")
  const [district, setDistrict] = useState("")
  const [education, setEducation] = useState("")
  const [profession, setProfession] = useState("")

  useEffect(() => {
    getRegistrationPlan()
      .then(r => { if (r.required) setPlan(r.plan) })
      .finally(() => setPlanLoading(false))
  }, [])

  function validate(): string | null {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) return "Enter a valid 10-digit mobile number"
    if (!username.trim() || username.trim().length < 2) return "Full name must be at least 2 characters"
    if (!password || password.length < 6) return "Password must be at least 6 characters"
    if (password !== confirmPassword) return "Passwords do not match"
    if (!gotraSelf.trim()) return "Your gotra (gotraSelf) is required"
    if (!gotraMother.trim()) return "Mother's gotra is required"
    if (!dob.trim()) return "Date of birth is required (YYYY-MM-DD)"
    if (!district.trim()) return "District is required"
    if (!education.trim()) return "Education is required"
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }
    setError("")
    setLoading(true)

    const payload = {
      phone: phone.replace(/\D/g, "").slice(-10),
      username: username.trim(),
      password,
      profileType,
      gotraSelf: gotraSelf.trim(),
      gotraMother: gotraMother.trim(),
      dob: dob.trim(),
      district: district.trim(),
      education: education.trim(),
      profession: profession.trim() || undefined,
    }

    try {
      if (plan) {
        // Paid path — create order then show QR
        const order = await createPaymentOrder(payload)
        setOrderRef(order.orderRef)
        setStep("qr")
      } else {
        // Free path
        const result = await register(payload)
        await setSession(result.token, result.user)
        router.replace("/(tabs)/home")
      }
    } catch (err) {
      setError(err instanceof ApiCallError ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (step === "qr") {
    return (
      <QRPaymentStep
        plan={plan!}
        orderRef={orderRef}
        phone={phone.replace(/\D/g, "").slice(-10)}
        password={password}
        onBack={() => setStep("form")}
      />
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Join Parivar</Text>
          <View style={{ width: 50 }} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {plan && (
          <View style={styles.planBanner}>
            <Text style={styles.planText}>
              Registration fee: ₹{plan.amountInr} ({plan.durationDays}-day membership)
            </Text>
            <Text style={styles.planSub}>{plan.name} — Pay via UPI after filling details</Text>
          </View>
        )}

        <View style={styles.card}>
          {/* Profile Type */}
          <Text style={styles.sectionTitle}>Profile Type</Text>
          <View style={styles.toggleRow}>
            {(["GROOM", "BRIDE"] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.toggleBtn, profileType === t && styles.toggleActive]}
                onPress={() => setProfileType(t)}
              >
                <Text style={[styles.toggleText, profileType === t && styles.toggleTextActive]}>
                  {t === "GROOM" ? "Groom (Var)" : "Bride (Vadhu)"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label="Full Name *" value={username} onChange={setUsername} placeholder="e.g. Ramesh Singh Mewada" />
          <Field label="Mobile Number *" value={phone} onChange={setPhone} placeholder="10-digit number" keyboardType="phone-pad" />
          <Field label="Your Gotra *" value={gotraSelf} onChange={setGotraSelf} placeholder="e.g. Dod" />
          <Field label="Mother's Gotra *" value={gotraMother} onChange={setGotraMother} placeholder="e.g. Rathore" />
          <Field label="Date of Birth * (YYYY-MM-DD)" value={dob} onChange={setDob} placeholder="1998-05-20" keyboardType="numbers-and-punctuation" />
          <Field label="District *" value={district} onChange={setDistrict} placeholder="e.g. Bhopal" />
          <Field label="Education *" value={education} onChange={setEducation} placeholder="e.g. B.Com, Graduate" />
          <Field label="Profession" value={profession} onChange={setProfession} placeholder="e.g. Private Job" />
          <Field label="Password *" value={password} onChange={setPassword} placeholder="Min 6 characters" secureTextEntry />
          <Field label="Confirm Password *" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" secureTextEntry />

          <TouchableOpacity
            style={[styles.btn, (loading || planLoading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading || planLoading}
          >
            <Text style={styles.btnText}>
              {planLoading ? "Loading…" : loading ? "Please wait…" : plan ? `Proceed to Pay ₹${plan.amountInr}` : "Register Free"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/login")}>
            <Text style={styles.linkText}>Already registered? <Text style={styles.linkBold}>Login →</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── QR Payment Step ─────────────────────────────────────────────────────────

function QRPaymentStep({
  plan, orderRef, phone, password, onBack,
}: {
  plan: RegistrationPlan
  orderRef: string
  phone: string
  password: string
  onBack: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function pickScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (!result.canceled && result.assets?.[0]) {
      setScreenshotUri(result.assets[0].uri)
      setError("")
    }
  }

  async function handleComplete() {
    if (!screenshotUri) { setError("Please upload your payment screenshot"); return }
    setLoading(true)
    setError("")

    try {
      await uploadPaymentScreenshot(screenshotUri, "image/jpeg", orderRef)
      const result = await completeRegistration(orderRef)
      await setSession(result.token, result.user)
      router.replace("/registration-success")
    } catch (err) {
      setError(err instanceof ApiCallError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back to form</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pay ₹{plan.amountInr}</Text>
        <Text style={styles.qrInstructions}>
          Scan the QR code below using any UPI app (GPay, PhonePe, Paytm) and pay ₹{plan.amountInr}.
          Then upload the payment screenshot.
        </Text>

        {/* QR Image served from the backend */}
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: `${process.env.EXPO_PUBLIC_API_URL?.replace("/api/v1", "")}/images/QR-for_payment.jpeg` }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.planBadge}>{plan.name} · ₹{plan.amountInr}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.uploadBtn} onPress={pickScreenshot}>
          <Text style={styles.uploadBtnText}>
            {screenshotUri ? "✓ Screenshot selected — tap to change" : "Upload Payment Screenshot"}
          </Text>
        </TouchableOpacity>

        {screenshotUri && (
          <Image
            source={{ uri: screenshotUri }}
            style={styles.screenshotPreview}
            resizeMode="cover"
          />
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your account will be created immediately. Admin will verify your payment and approve your profile within 24 hours.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Completing registration…" : "I've Paid — Complete Registration"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

// ─── Reusable field ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, keyboardType, secureTextEntry,
}: {
  label: string; value: string; onChange: (t: string) => void
  placeholder?: string; keyboardType?: any; secureTextEntry?: boolean
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.mutedLight}
        keyboardType={keyboardType ?? "default"}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
    </>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: Colors.maroon, padding: Spacing.md, paddingTop: 50, paddingBottom: 40 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.md },
  backBtn: { marginBottom: Spacing.sm },
  backText: { color: Colors.goldBright, fontWeight: "600", fontSize: FontSize.sm },
  topTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: "700" },
  card: { backgroundColor: Colors.white, borderRadius: Radii.xl, padding: Spacing.lg, borderWidth: 2, borderColor: Colors.gold },
  cardTitle: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.maroon, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.maroon, marginTop: Spacing.sm, marginBottom: 6 },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: Spacing.sm },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: Radii.md, borderWidth: 2, borderColor: Colors.border, alignItems: "center" },
  toggleActive: { backgroundColor: Colors.maroon, borderColor: Colors.maroon },
  toggleText: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.muted },
  toggleTextActive: { color: Colors.white },
  label: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.maroon, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSize.base, color: Colors.text,
  },
  btn: { backgroundColor: Colors.maroon, borderRadius: Radii.full, paddingVertical: 14, alignItems: "center", marginTop: Spacing.lg },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.md },
  linkRow: { alignItems: "center", marginTop: Spacing.md },
  linkText: { color: Colors.muted, fontSize: FontSize.sm },
  linkBold: { color: Colors.maroon, fontWeight: "700" },
  errorText: { backgroundColor: "#FEE2E2", color: Colors.error, borderRadius: Radii.sm, padding: Spacing.sm, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  planBanner: { backgroundColor: "#FEF3C7", borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  planText: { color: Colors.amber, fontWeight: "700", fontSize: FontSize.sm },
  planSub: { color: Colors.amber, fontSize: FontSize.xs, marginTop: 2 },
  qrInstructions: { fontSize: FontSize.sm, color: Colors.muted, marginBottom: Spacing.md, lineHeight: 20 },
  qrContainer: { alignItems: "center", backgroundColor: Colors.creamDark, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 2, borderColor: Colors.gold, marginBottom: Spacing.sm },
  qrImage: { width: 220, height: 220 },
  planBadge: { textAlign: "center", fontWeight: "700", color: Colors.amber, marginBottom: Spacing.md },
  uploadBtn: { backgroundColor: Colors.creamDark, borderWidth: 2, borderColor: Colors.gold, borderStyle: "dashed", borderRadius: Radii.lg, padding: Spacing.md, alignItems: "center", marginBottom: Spacing.sm },
  uploadBtnText: { color: Colors.maroon, fontWeight: "600", fontSize: FontSize.sm, textAlign: "center" },
  screenshotPreview: { width: "100%", height: 140, borderRadius: Radii.md, marginBottom: Spacing.sm },
  infoBox: { backgroundColor: Colors.blueMuted, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  infoText: { color: Colors.blue, fontSize: FontSize.xs, lineHeight: 18 },
})
