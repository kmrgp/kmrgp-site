"use client"

import type { ReactNode } from "react"
import Link from "next/link"

interface AuthPageShellProps {
  title: string
  description: string
  children: ReactNode
  wide?: boolean
  alternate?: { href: string; label: string }
}
 
export function AuthPageShell({
  title,
  description,
  children,
  wide,
  alternate,
}: AuthPageShellProps) {
  return (
    <main className="overflow-x-hidden bg-cream px-3 pb-12 pt-[calc(76px+2rem)] sm:px-4 sm:pb-14 sm:pt-[calc(76px+3.5rem)]">
      <div className={`mx-auto w-full min-w-0 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="overflow-hidden rounded-3xl border-4 border-gold-light bg-white p-4 shadow-lg sm:p-8">
          <h1 className="type-h2 mb-2 text-center text-maroon">{title}</h1>
          <p className="type-body-sm mb-8 text-center text-muted-foreground">{description}</p>
          {children}
          {alternate && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              <Link
                href={alternate.href}
                className="font-semibold text-saffron underline-offset-4 transition hover:text-maroon hover:underline"
              >
                {alternate.label}
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
