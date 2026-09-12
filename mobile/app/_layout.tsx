import { useEffect } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { initAuth, useAuth } from "@/store/authStore"
import { View, ActivityIndicator } from "react-native"

export default function RootLayout() {
  const { loading } = useAuth()

  useEffect(() => {
    initAuth()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#7B1C1C" }}>
        <ActivityIndicator size="large" color="#F0C040" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
