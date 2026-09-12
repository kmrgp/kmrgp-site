import { useEffect } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as SplashScreen from "expo-splash-screen"
import { initAuth, useAuth } from "@/store/authStore"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { loading } = useAuth()

  useEffect(() => {
    initAuth().finally(() => SplashScreen.hideAsync())
  }, [])

  if (loading) return null

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
