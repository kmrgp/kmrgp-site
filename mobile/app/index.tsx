import { Redirect } from "expo-router"
import { useAuth } from "@/store/authStore"

export default function Index() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Redirect href={user ? "/(tabs)/home" : "/login"} />
}
