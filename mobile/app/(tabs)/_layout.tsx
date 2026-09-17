import { Tabs, Redirect } from "expo-router"
import { useAuth } from "@/store/authStore"
import { Colors } from "@/constants/theme"
import { Text } from "react-native"
import type { ColorValue } from "react-native"

export default function TabLayout() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Redirect href="/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.maroon,
        tabBarInactiveTintColor: Colors.mutedLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 4,
          height: 64,
        } as object,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" } as object,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }: { color: ColorValue }) => <TabIcon emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color }: { color: ColorValue }) => <TabIcon emoji="🔍" />,
        }}
      />
      <Tabs.Screen
        name="interests"
        options={{
          title: "Interests",
          tabBarIcon: ({ color }: { color: ColorValue }) => <TabIcon emoji="💌" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }: { color: ColorValue }) => <TabIcon emoji="👤" />,
        }}
      />
    </Tabs>
  )
}

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 } as object}>{emoji}</Text>
}
