"use client"

import Link from "next/link"
import { Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { LanguageToggle } from "@/components/layout/LanguageToggle"
import { NotificationBadge } from "@/components/layout/NotificationBadge"
import { logoutAction } from "@/lib/actions/auth"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { SessionUser } from "@/types"

interface HeaderClientProps {
  session: SessionUser | null
}

export function HeaderClient({ session }: HeaderClientProps) {
  const { t } = useLang()

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gold/20 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="rajput-border" />
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-gradient-to-br from-maroon to-saffron font-heading text-lg font-extrabold text-white shadow-md sm:h-11 sm:w-11 sm:text-xl">
            K
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-heading text-sm font-bold text-maroon sm:text-base">{t("brand.name")}</span>
            <span className="truncate text-[9px] font-bold uppercase tracking-heritage text-saffron sm:text-[10.5px]">
              {t("brand.tagline")}
            </span>
          </div>
        </Link>

        <nav className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-1">
            <NavLink href="/">{t("nav.home")}</NavLink>
            <NavLink href="/profiles">{t("nav.matches")}</NavLink>
            {session && (
              <span className="flex items-center gap-1.5">
                <NavLink href="/dashboard">{t("nav.dashboard")}</NavLink>
                <NotificationBadge />
              </span>
            )}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
          {session ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2 rounded-full border border-gold-light bg-cream-dark pl-1 pr-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon text-white">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-maroon">{session.username || "Member"}</span>
                  <span className="text-[9px] font-bold uppercase text-saffron">{session.role.replace("_", " ")}</span>
                </div>
              </Link>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="sm">{t("nav.logout")}</Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">{t("nav.joinParivar")}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
              <div className="mb-6 border-b border-gold-light pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("nav.navigation")}</span>
              </div>
              <nav className="flex flex-col gap-2">
                <MobileLink href="/">{t("nav.home")}</MobileLink>
                <MobileLink href="/profiles">{t("nav.matches")}</MobileLink>
                {session && (
                  <MobileLink href="/dashboard">
                    <span className="flex items-center gap-2">
                      {t("nav.dashboard")}
                      <NotificationBadge />
                    </span>
                  </MobileLink>
                )}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t border-gold-light pt-6">
                {session ? (
                  <form action={logoutAction}>
                    <Button type="submit" variant="outline" className="w-full">{t("nav.logout")}</Button>
                  </form>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/login">{t("nav.login")}</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button className="w-full" asChild>
                        <Link href="/signup">{t("nav.joinParivar")}</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="relative rounded-lg px-4 py-2 text-sm font-semibold text-foreground/90 transition hover:bg-cream-warm hover:text-maroon"
      >
        {children}
      </Link>
    </li>
  )
}

function MobileLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-bold text-maroon transition hover:bg-gold-light hover:pl-5"
      >
        {children}
      </Link>
    </SheetClose>
  )
}
