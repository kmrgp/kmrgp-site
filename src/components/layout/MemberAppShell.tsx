"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Home, User, Heart, Search, Shield, Crown, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { LogoutButton } from "@/components/auth/LogoutButton"
import type { Role } from "@/types"

export type MemberNavActive = "home" | "browse" | "profile" | "interests" | "admin" | "superadmin"

interface MemberAppShellProps {
  children: React.ReactNode
  role: Role
  pendingInterests?: number
}

function useMemberNavItems(role: Role, pendingInterests: number, compact = false) {
  const { t } = useLang()
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
  const isSuperAdmin = role === "SUPER_ADMIN"

  const items: {
    id: MemberNavActive
    label: string
    icon: React.ElementType
    href: string
    badge?: number
  }[] = [
    { id: "home", label: t("nav.home"), icon: Home, href: "/" },
    { id: "browse", label: t("dash.navBrowse"), icon: Search, href: "/profiles" },
    { id: "profile", label: t("dash.navProfile"), icon: User, href: "/dashboard" },
    {
      id: "interests",
      label: t("dash.navInterests"),
      icon: Heart,
      href: "/dashboard?tab=interests",
      badge: pendingInterests,
    },
  ]

  if (isAdmin) {
    items.push({ id: "admin", label: t("dash.navAdmin"), icon: Shield, href: "/dashboard?tab=admin" })
  }
  if (isSuperAdmin && !compact) {
    items.push({ id: "superadmin", label: t("dash.navSuper"), icon: Crown, href: "/dashboard?tab=superadmin" })
  }

  return items
}

function useActiveNav(): MemberNavActive {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dashTab = searchParams.get("tab") ?? "profile"

  if (pathname === "/") return "home"
  if (pathname.startsWith("/profiles")) return "browse"
  if (pathname.startsWith("/dashboard")) {
    if (dashTab === "interests") return "interests"
    if (dashTab === "admin") return "admin"
    if (dashTab === "superadmin") return "superadmin"
    return "profile"
  }
  return "home"
}

function NavLinkItem({
  item,
  isActive,
  variant,
}: {
  item: ReturnType<typeof useMemberNavItems>[number]
  isActive: boolean
  variant: "sidebar" | "bottom"
}) {
  const Icon = item.icon

  if (variant === "sidebar") {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
          isActive ? "bg-maroon text-white shadow-sm" : "text-maroon/80 hover:bg-cream-dark hover:text-maroon"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="relative shrink-0">
          <Icon className="h-5 w-5" />
          {item.badge != null && item.badge > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-saffron px-1 text-[9px] font-bold text-white">
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 transition active:scale-95",
        isActive && "bg-maroon/5"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="relative">
        <Icon className={cn("h-5 w-5", isActive ? "text-maroon" : "text-muted-foreground")} />
        {item.badge != null && item.badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-saffron px-1 text-[9px] font-bold text-white">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "w-full truncate text-center text-[9px] font-bold leading-tight",
          isActive ? "text-maroon" : "text-muted-foreground"
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

export function MemberAppShell({ children, role, pendingInterests = 0 }: MemberAppShellProps) {
  const { t } = useLang()
  const sidebarItems = useMemberNavItems(role, pendingInterests, false)
  const bottomItems = useMemberNavItems(role, pendingInterests, true)
  const active = useActiveNav()
  const bottomActive = active === "superadmin" ? "admin" : active

  return (
    <div className="flex w-full min-w-0">
      <aside className="no-print hidden lg:sticky lg:top-[76px] lg:flex lg:h-[calc(100dvh-76px)] lg:max-h-[calc(100dvh-76px)] lg:w-56 lg:shrink-0 lg:flex-col lg:self-start border-r border-gold/20 bg-white">
        <div className="shrink-0 border-b border-gold-light px-4 py-5">
          <p className="font-heading text-base font-bold leading-tight text-maroon">{t("member.shellTitle")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("member.shellSub")}</p>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label={t("nav.navigation")}>
          {sidebarItems.map((item) => (
            <NavLinkItem key={item.id} item={item} isActive={active === item.id} variant="sidebar" />
          ))}
        </nav>
        <div className="shrink-0 border-t border-gold-light bg-white p-3">
          <LogoutButton variant="outline" size="sm" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </LogoutButton>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-8">
        {children}
      </div>

      <nav
        className="no-print fixed bottom-0 left-0 right-0 z-40 w-full border-t border-gold/25 bg-white/95 shadow-[0_-4px_24px_rgba(128,0,32,0.08)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-label={t("nav.navigation")}
      >
        <ul className="mx-auto flex w-full min-w-0 max-w-lg items-stretch justify-around px-1 pt-1">
          {bottomItems.map((item) => (
            <li key={item.id} className="min-w-0 flex-1">
              <NavLinkItem item={item} isActive={bottomActive === item.id} variant="bottom" />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export const MEMBER_NAV_PB = "pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-8"
