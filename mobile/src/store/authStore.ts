/**
 * Auth store — persists login state across app restarts.
 * Uses AsyncStorage for both token and user object (Expo Go compatible).
 */

import { useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { saveToken, clearToken, getToken } from "@/api/client"
import { getMe } from "@/api/auth"
import type { AuthUser } from "@/types"

const USER_KEY = "kmrgp_user"

// ─── Module-level state ───────────────────────────────────────────────────────

let _user: AuthUser | null = null
let _loading = true
const _listeners = new Set<() => void>()

function notify() {
  _listeners.forEach((fn) => fn())
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function subscribe(fn: () => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export function getAuthState(): { user: AuthUser | null; loading: boolean } {
  return { user: _user, loading: _loading }
}

export async function initAuth(): Promise<void> {
  _loading = true
  notify()
  try {
    const token = await getToken()
    if (!token) {
      _user = null
      return
    }
    // Show cached user immediately while we verify with server
    const cached = await AsyncStorage.getItem(USER_KEY)
    if (cached) {
      try {
        _user = JSON.parse(cached) as AuthUser
        notify()
      } catch {
        // ignore bad cache
      }
    }
    // Verify token is still valid
    const fresh = await getMe()
    _user = fresh
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh))
  } catch {
    // Token expired or no network — use cached user if available, else sign out
    if (!_user) {
      await signOut()
    }
  } finally {
    _loading = false
    notify()
  }
}

export async function setSession(token: string, user: AuthUser): Promise<void> {
  await saveToken(token)
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
  _user = user
  _loading = false
  notify()
}

export async function signOut(): Promise<void> {
  await clearToken()
  await AsyncStorage.removeItem(USER_KEY)
  _user = null
  _loading = false
  notify()
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useAuth(): { user: AuthUser | null; loading: boolean } {
  const [state, setState] = useState(getAuthState)

  useEffect(() => {
    const unsub = subscribe(() => setState({ ...getAuthState() }))
    return unsub
  }, [])

  return state
}
