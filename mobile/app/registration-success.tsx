import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { Colors, Spacing, Radii, FontSize } from "@/constants/theme"

export default function RegistrationSuccess() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.title}>Registration Submitted!</Text>
        <Text style={styles.subtitle}>Welcome to Kshatriya Mewada Rajput Parivar</Text>
        <Text style={styles.body}>
          Your account has been created and your payment screenshot has been sent for admin review.
          Your profile will be approved within 24 hours.
        </Text>

        <View style={styles.steps}>
          <StepRow done label="Account created" />
          <StepRow done label="Payment screenshot submitted" />
          <StepRow pending label="Admin will verify & approve your profile" />
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => router.replace("/(tabs)/home")}>
          <Text style={styles.btnText}>Go to My Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Log in with your registered mobile number and password if prompted.
        </Text>
      </View>
    </View>
  )
}

function StepRow({ done, pending, label }: { done?: boolean; pending?: boolean; label: string }) {
  return (
    <View style={styles.stepRow}>
      <Text style={[styles.stepIcon, done ? styles.stepDone : styles.stepPending]}>
        {done ? "✓" : "⏳"}
      </Text>
      <Text style={[styles.stepLabel, done ? styles.stepLabelDone : styles.stepLabelPending]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.maroon, justifyContent: "center", padding: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: Radii.xl, padding: Spacing.xl, borderWidth: 2, borderColor: Colors.gold, alignItems: "center" },
  icon: { fontSize: 56, marginBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: "800", color: Colors.maroon, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: FontSize.sm, color: Colors.muted, textAlign: "center", marginBottom: Spacing.md },
  body: { fontSize: FontSize.sm, color: Colors.text, textAlign: "center", lineHeight: 20, marginBottom: Spacing.lg },
  steps: { width: "100%", backgroundColor: Colors.creamDark, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepIcon: { fontSize: 16, fontWeight: "700" },
  stepDone: { color: Colors.success },
  stepPending: { color: Colors.saffron },
  stepLabel: { fontSize: FontSize.sm, flex: 1 },
  stepLabelDone: { color: Colors.success, fontWeight: "600" },
  stepLabelPending: { color: Colors.amber, fontWeight: "600" },
  btn: { backgroundColor: Colors.maroon, borderRadius: Radii.full, paddingVertical: 14, paddingHorizontal: 32, marginBottom: Spacing.md },
  btnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.md },
  hint: { fontSize: FontSize.xs, color: Colors.mutedLight, textAlign: "center" },
})
