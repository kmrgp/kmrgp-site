import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { login } from "@/api/auth"
import { setSession } from "@/store/authStore"
import { ApiCallError } from "@/api/client"
import { Colors, Spacing, Radii, FontSize } from "@/constants/theme"

export default function LoginScreen() {
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin() {
    if (!loginId.trim()) { setError("Enter your mobile number or username"); return }
    if (!password) { setError("Enter your password"); return }

    setError("")
    setLoading(true)
    try {
      const result = await login(loginId.trim(), password)
      await setSession(result.token, result.user)
      router.replace("/(tabs)/home")
    } catch (err) {
      if (err instanceof ApiCallError) {
        setError(err.message)
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>ॐ</Text>
          <Text style={styles.title}>Kshatriya Mewada Rajput</Text>
          <Text style={styles.subtitle}>Parivar · Uniting Families</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Mobile Number / Username</Text>
          <TextInput
            style={styles.input}
            value={loginId}
            onChangeText={t => { setLoginId(t); setError("") }}
            placeholder="9876543210 or username"
            placeholderTextColor={Colors.mutedLight}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.flex]}
              value={password}
              onChangeText={t => { setPassword(t); setError("") }}
              placeholder="Your password"
              placeholderTextColor={Colors.mutedLight}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? "Logging in…" : "Login"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/register")}>
            <Text style={styles.linkText}>New here? <Text style={styles.linkBold}>Join Parivar →</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.maroon,
    paddingHorizontal: Spacing.md,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: { alignItems: "center", marginBottom: Spacing.xl },
  brandName: { fontSize: 40, color: Colors.gold, marginBottom: 4 },
  title: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.white, textAlign: "center" },
  subtitle: { fontSize: FontSize.sm, color: Colors.goldBright, marginTop: 4 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  cardTitle: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.maroon, marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.maroon, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.base,
    color: Colors.text,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: { padding: 12 },
  eyeText: { color: Colors.maroon, fontSize: FontSize.sm, fontWeight: "600" },
  btn: {
    backgroundColor: Colors.maroon,
    borderRadius: Radii.full,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.md },
  linkRow: { alignItems: "center", marginTop: Spacing.md },
  linkText: { color: Colors.muted, fontSize: FontSize.sm },
  linkBold: { color: Colors.maroon, fontWeight: "700" },
  errorText: {
    backgroundColor: "#FEE2E2",
    color: Colors.error,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
})
